import type { SupabaseClient } from '@supabase/supabase-js';
import type { CollectionRecord, HelpKind } from './collection';
import {
  applyCaught,
  applyHelped,
  applySpotted,
  type CollectionStore,
} from './collectionStore';

// Supabase-backed collection store (T-027 / T-056). Implements the same CollectionStore interface
// as the in-memory store, so screens swap to it with no changes. It reuses the pure state
// transitions (apply* in collectionStore.ts) so the domain rules are defined once and tested
// once. Persistence is factored behind a tiny `CollectionGateway` port: the store (mapping +
// rules) is unit-tested against a fake gateway, and `SupabaseCollectionGateway` is the thin
// supabase-js adapter (verified against the live DB + RLS via the connector).

/** The `collection` table row shape (snake_case), for the columns we read/write. */
export interface CollectionRow {
  user_id: string;
  species_id: string;
  spotted_at: string | null;
  caught_at: string | null;
  helped_at: string | null;
  helped_kind: HelpKind | null;
  prime_bonus: boolean;
}

export const COLLECTION_COLUMNS =
  'user_id,species_id,spotted_at,caught_at,helped_at,helped_kind,prime_bonus';

export function rowToRecord(row: CollectionRow): CollectionRecord {
  return {
    speciesId: row.species_id,
    spottedAt: row.spotted_at,
    caughtAt: row.caught_at,
    helpedAt: row.helped_at,
    helpedKind: row.helped_kind,
    primeBonus: row.prime_bonus,
  };
}

export function recordToRow(record: CollectionRecord, userId: string): CollectionRow {
  return {
    user_id: userId,
    species_id: record.speciesId,
    spotted_at: record.spottedAt,
    caught_at: record.caughtAt,
    helped_at: record.helpedAt,
    helped_kind: record.helpedKind,
    prime_bonus: record.primeBonus,
  };
}

/** The persistence operations the store needs — kept minimal so it is trivially fakeable. */
export interface CollectionGateway {
  selectAll(userId: string): Promise<CollectionRow[]>;
  selectOne(userId: string, speciesId: string): Promise<CollectionRow | null>;
  upsertOne(row: CollectionRow): Promise<void>;
}

export class SupabaseCollectionStore implements CollectionStore {
  constructor(
    private readonly gateway: CollectionGateway,
    private readonly getUserId: () => Promise<string>,
  ) {}

  async list(): Promise<CollectionRecord[]> {
    const userId = await this.getUserId();
    return (await this.gateway.selectAll(userId)).map(rowToRecord);
  }

  async get(speciesId: string): Promise<CollectionRecord | null> {
    const userId = await this.getUserId();
    const row = await this.gateway.selectOne(userId, speciesId);
    return row ? rowToRecord(row) : null;
  }

  markSpotted(speciesId: string, at: string): Promise<CollectionRecord> {
    return this.apply(speciesId, (current) => applySpotted(current, speciesId, at));
  }

  markCaught(speciesId: string, at: string, primeBonus: boolean): Promise<CollectionRecord> {
    return this.apply(speciesId, (current) => applyCaught(current, speciesId, at, primeBonus));
  }

  markHelped(speciesId: string, kind: HelpKind, at: string): Promise<CollectionRecord> {
    return this.apply(speciesId, (current) => applyHelped(current, speciesId, kind, at));
  }

  /** Read the current row, apply the pure transition, write it back. */
  private async apply(
    speciesId: string,
    transition: (current: CollectionRecord | null) => CollectionRecord,
  ): Promise<CollectionRecord> {
    const userId = await this.getUserId();
    const existing = await this.gateway.selectOne(userId, speciesId);
    const next = transition(existing ? rowToRecord(existing) : null);
    await this.gateway.upsertOne(recordToRow(next, userId));
    return next;
  }
}

/** supabase-js adapter for `CollectionGateway`. RLS scopes every query to the signed-in user. */
export class SupabaseCollectionGateway implements CollectionGateway {
  constructor(private readonly client: SupabaseClient) {}

  async selectAll(userId: string): Promise<CollectionRow[]> {
    const { data, error } = await this.client
      .from('collection')
      .select(COLLECTION_COLUMNS)
      .eq('user_id', userId);
    if (error) throw new Error(`collection selectAll failed: ${error.message}`);
    return (data ?? []) as CollectionRow[];
  }

  async selectOne(userId: string, speciesId: string): Promise<CollectionRow | null> {
    const { data, error } = await this.client
      .from('collection')
      .select(COLLECTION_COLUMNS)
      .eq('user_id', userId)
      .eq('species_id', speciesId)
      .maybeSingle();
    if (error) throw new Error(`collection selectOne failed: ${error.message}`);
    return (data as CollectionRow | null) ?? null;
  }

  async upsertOne(row: CollectionRow): Promise<void> {
    const { error } = await this.client
      .from('collection')
      .upsert(row, { onConflict: 'user_id,species_id' });
    if (error) throw new Error(`collection upsert failed: ${error.message}`);
  }
}
