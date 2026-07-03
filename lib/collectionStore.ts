import type { CollectionRecord, HelpKind } from './collection';

// Collection persistence seam (T-116). An async interface so the Supabase-backed store (T-056)
// is a drop-in replacement, plus an in-memory implementation the Kronoberg prototype (T-027)
// can run on before any backend exists. Timestamps are passed in by the caller (clock-free →
// unit-testable). Domain rule: catching or helping a species also marks it spotted — you
// cannot reach a higher tier without knowing it lives around you (USER-FLOWS §4–6).

export interface CollectionStore {
  list(): Promise<CollectionRecord[]>;
  get(speciesId: string): Promise<CollectionRecord | null>;
  markSpotted(speciesId: string, at: string): Promise<CollectionRecord>;
  markCaught(speciesId: string, at: string, primeBonus: boolean): Promise<CollectionRecord>;
  markHelped(speciesId: string, kind: HelpKind, at: string): Promise<CollectionRecord>;
}

function blankRecord(speciesId: string): CollectionRecord {
  return {
    speciesId,
    spottedAt: null,
    caughtAt: null,
    helpedAt: null,
    helpedKind: null,
    primeBonus: false,
  };
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

  private upsert(speciesId: string, patch: Partial<CollectionRecord>): CollectionRecord {
    const current = this.records.get(speciesId) ?? blankRecord(speciesId);
    const next = { ...current, ...patch };
    this.records.set(speciesId, next);
    return { ...next };
  }

  async markSpotted(speciesId: string, at: string): Promise<CollectionRecord> {
    const current = this.records.get(speciesId);
    // Do not overwrite an earlier spotted time.
    return this.upsert(speciesId, { spottedAt: current?.spottedAt ?? at });
  }

  async markCaught(speciesId: string, at: string, primeBonus: boolean): Promise<CollectionRecord> {
    const current = this.records.get(speciesId);
    return this.upsert(speciesId, {
      spottedAt: current?.spottedAt ?? at, // catching implies spotted
      caughtAt: at,
      primeBonus,
    });
  }

  async markHelped(speciesId: string, kind: HelpKind, at: string): Promise<CollectionRecord> {
    const current = this.records.get(speciesId);
    return this.upsert(speciesId, {
      spottedAt: current?.spottedAt ?? at, // helping implies spotted
      helpedAt: at,
      helpedKind: kind,
    });
  }
}
