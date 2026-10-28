import type { CollectionRecord, HelpKind } from './collection';
import {
  applyCaught,
  applyHelped,
  applySpotted,
  CatchRefusedError,
  type CollectionStore,
} from './collectionStore';
import { mergeLists } from './collectionMerge';

// Offline-first collection store (T-165).
//
// The device is the source of truth. Every write lands in a local cache first and is returned to
// the caller straight away, so a catch made in a forest with no signal is recorded, rendered and
// kept. Delivery to the server is a separate, retryable concern: the same write is appended to an
// outbox that drains whenever `sync()` is called and survives an app restart.
//
// This replaces a path where `useCollection` sent writes directly to Supabase and swallowed the
// rejection in a `console.warn` — offline, the tap did nothing and the record was gone.
//
// Why this is safe without a CRDT: see collectionMerge.ts. Collection timestamps are monotonic and
// one-way, so replaying the outbox in any order, twice, or against a server copy that raced with
// it, converges on the same record.

const STORAGE_VERSION = 1;

export interface OfflineCache {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

/** A queued write, kept as intent rather than as a final row so replay stays convergent. */
interface PendingOp {
  kind: 'spotted' | 'caught' | 'helped';
  speciesId: string;
  at: string;
  primeBonus?: boolean;
  helpedKind?: HelpKind;
}

interface Persisted {
  version: number;
  records: CollectionRecord[];
  pending: PendingOp[];
}

export class InMemoryOfflineCache implements OfflineCache {
  private value: string | null = null;
  async read() {
    return this.value;
  }
  async write(value: string) {
    this.value = value;
  }
}

/** AsyncStorage-backed cache, mirroring consentStore / dualLanguageStore. */
export class AsyncStorageOfflineCache implements OfflineCache {
  static readonly KEY = 'nearby.collection.v1';
  constructor(
    private readonly storage: {
      getItem(k: string): Promise<string | null>;
      setItem(k: string, v: string): Promise<void>;
    },
  ) {}
  async read() {
    return this.storage.getItem(AsyncStorageOfflineCache.KEY);
  }
  async write(value: string) {
    await this.storage.setItem(AsyncStorageOfflineCache.KEY, value);
  }
}

export class OfflineCollectionStore implements CollectionStore {
  private records = new Map<string, CollectionRecord>();
  private pending: PendingOp[] = [];
  private syncChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly cache: OfflineCache,
    private readonly remote: CollectionStore | null,
  ) {}

  /** Load whatever the last session left behind. Corrupt data decays to empty, never throws. */
  async hydrate(): Promise<void> {
    let raw: string | null = null;
    try {
      raw = await this.cache.read();
    } catch {
      return; // storage unavailable — run in memory rather than block the app
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.records)) return;
      this.records = new Map(parsed.records.map((r) => [r.speciesId, r]));
      this.pending = Array.isArray(parsed.pending) ? parsed.pending : [];
    } catch {
      // Unparseable cache is not worth losing the session over; start clean.
    }
  }

  async list(): Promise<CollectionRecord[]> {
    return [...this.records.values()].sort((a, b) => a.speciesId.localeCompare(b.speciesId));
  }

  async get(speciesId: string): Promise<CollectionRecord | null> {
    return this.records.get(speciesId) ?? null;
  }

  async markSpotted(speciesId: string, at: string): Promise<CollectionRecord> {
    return this.write(applySpotted(this.records.get(speciesId) ?? null, speciesId, at), {
      kind: 'spotted',
      speciesId,
      at,
    });
  }

  async markCaught(speciesId: string, at: string, primeBonus: boolean): Promise<CollectionRecord> {
    return this.write(
      applyCaught(this.records.get(speciesId) ?? null, speciesId, at, primeBonus),
      { kind: 'caught', speciesId, at, primeBonus },
    );
  }

  async markHelped(speciesId: string, kind: HelpKind, at: string): Promise<CollectionRecord> {
    return this.write(applyHelped(this.records.get(speciesId) ?? null, speciesId, kind, at), {
      kind: 'helped',
      speciesId,
      at,
      helpedKind: kind,
    });
  }

  /** Queued writes not yet accepted by the server — lets the UI show "saved, syncing later". */
  pendingCount(): number {
    return this.pending.length;
  }

  /**
   * Drain the outbox, then reconcile with the server copy. Never throws: a failed drain leaves the
   * queue exactly as it was, to be retried on the next call.
   */
  async sync(): Promise<void> {
    // Serialised rather than guarded by a boolean. A boolean would make an explicit sync() a
    // silent no-op whenever the fire-and-forget one from write() was still in flight — so coming
    // back online right after a failed write would leave the queue sitting there until the next
    // write happened to trigger it.
    const run = this.syncChain.then(() => this.drain());
    this.syncChain = run.catch(() => undefined);
    return run;
  }

  private async drain(): Promise<void> {
    if (!this.remote || this.pending.length === 0) return;
    try {
      const queue = [...this.pending];
      const delivered: PendingOp[] = [];
      try {
        for (const op of queue) {
          try {
            await this.deliver(op);
          } catch (error) {
            // The one permanent rejection (T-200): the server will never accept this catch, so
            // retrying would block every write queued behind it forever. Drop it and take the
            // species back to spotted — the device must not keep a catch the server refused.
            if (!(error instanceof CatchRefusedError)) throw error;
            this.uncatch(op.speciesId);
          }
          delivered.push(op);
        }
      } finally {
        // Drop only what the server actually accepted, so a mid-queue failure loses nothing.
        this.pending = this.pending.slice(delivered.length);
      }
      const remoteRecords = await this.remote.list();
      this.records = new Map(
        mergeLists([...this.records.values()], remoteRecords).map((r) => [r.speciesId, r]),
      );
      await this.persist();
    } catch {
      // Offline, or the server rejected mid-drain. Local state stands; retry next time.
      await this.persist();
    }
  }

  private async deliver(op: PendingOp): Promise<void> {
    const remote = this.remote;
    if (!remote) throw new Error('no remote');
    if (op.kind === 'spotted') await remote.markSpotted(op.speciesId, op.at);
    else if (op.kind === 'caught')
      await remote.markCaught(op.speciesId, op.at, op.primeBonus ?? false);
    else await remote.markHelped(op.speciesId, op.helpedKind ?? 'give', op.at);
  }

  private uncatch(speciesId: string): void {
    const record = this.records.get(speciesId);
    if (record) this.records.set(speciesId, { ...record, caughtAt: null, primeBonus: false });
  }

  private async write(record: CollectionRecord, op: PendingOp): Promise<CollectionRecord> {
    this.records.set(record.speciesId, record);
    this.pending.push(op);
    await this.persist();
    // Fire-and-forget: the caller already has its record, so a slow network never blocks the
    // delight moment. Failures stay queued.
    void this.sync().catch(() => undefined);
    return record;
  }

  private async persist(): Promise<void> {
    const payload: Persisted = {
      version: STORAGE_VERSION,
      records: [...this.records.values()],
      pending: this.pending,
    };
    try {
      await this.cache.write(JSON.stringify(payload));
    } catch {
      // A full or unavailable disk must not turn a catch into a crash.
    }
  }
}
