import type { CollectionRecord, HelpKind } from './collection';

// Collection persistence seam (T-116). An async interface so the Supabase-backed store (T-027 /
// T-056) is a drop-in replacement, plus an in-memory implementation the Kronoberg prototype can
// run on offline. Timestamps are passed in by the caller (clock-free → unit-testable). Domain
// rule: catching or helping a species also marks it spotted — you cannot reach a higher tier
// without knowing it lives around you (USER-FLOWS §4–6). Those rules live in the pure `apply*`
// helpers below so both stores share one tested implementation.

export interface CollectionStore {
  list(): Promise<CollectionRecord[]>;
  get(speciesId: string): Promise<CollectionRecord | null>;
  markSpotted(speciesId: string, at: string): Promise<CollectionRecord>;
  markCaught(speciesId: string, at: string, primeBonus: boolean): Promise<CollectionRecord>;
  markHelped(speciesId: string, kind: HelpKind, at: string): Promise<CollectionRecord>;
}

export function blankRecord(speciesId: string): CollectionRecord {
  return {
    speciesId,
    spottedAt: null,
    caughtAt: null,
    helpedAt: null,
    helpedKind: null,
    primeBonus: false,
  };
}

// ── Pure state transitions (shared by every store) ───────────────────────────
// `current` is the existing record or null. Spotted time is never overwritten; catching and
// helping imply spotted. Returning a fresh object keeps callers copy-safe.

export function applySpotted(
  current: CollectionRecord | null,
  speciesId: string,
  at: string,
): CollectionRecord {
  const base = current ?? blankRecord(speciesId);
  return { ...base, spottedAt: base.spottedAt ?? at };
}

export function applyCaught(
  current: CollectionRecord | null,
  speciesId: string,
  at: string,
  primeBonus: boolean,
): CollectionRecord {
  const base = current ?? blankRecord(speciesId);
  return { ...base, spottedAt: base.spottedAt ?? at, caughtAt: at, primeBonus };
}

export function applyHelped(
  current: CollectionRecord | null,
  speciesId: string,
  kind: HelpKind,
  at: string,
): CollectionRecord {
  const base = current ?? blankRecord(speciesId);
  return { ...base, spottedAt: base.spottedAt ?? at, helpedAt: at, helpedKind: kind };
}

export class InMemoryCollectionStore implements CollectionStore {
  private readonly records = new Map<string, CollectionRecord>();

  constructor(seed: CollectionRecord[] = []) {
    for (const r of seed) this.records.set(r.speciesId, { ...r });
  }

  async list(): Promise<CollectionRecord[]> {
    return [...this.records.values()].map((r) => ({ ...r }));
  }

  async get(speciesId: string): Promise<CollectionRecord | null> {
    const r = this.records.get(speciesId);
    return r ? { ...r } : null;
  }

  private put(record: CollectionRecord): CollectionRecord {
    this.records.set(record.speciesId, record);
    return { ...record };
  }

  async markSpotted(speciesId: string, at: string): Promise<CollectionRecord> {
    return this.put(applySpotted(this.records.get(speciesId) ?? null, speciesId, at));
  }

  async markCaught(speciesId: string, at: string, primeBonus: boolean): Promise<CollectionRecord> {
    return this.put(applyCaught(this.records.get(speciesId) ?? null, speciesId, at, primeBonus));
  }

  async markHelped(speciesId: string, kind: HelpKind, at: string): Promise<CollectionRecord> {
    return this.put(applyHelped(this.records.get(speciesId) ?? null, speciesId, kind, at));
  }
}
