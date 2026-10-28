import type { SupabaseClient } from '@supabase/supabase-js';
import { CatchRefusedError } from './collectionStore';
import {
  COLLECTION_COLUMNS,
  SupabaseCollectionGateway,
  type CollectionRow,
} from './supabaseCollectionStore';

// The supabase-js adapter was the untested layer: the store above it is covered against a fake
// gateway, but nothing checked that these methods hit the right table, filter on the right columns,
// or turn a Supabase error into a thrown one.
//
// That last part is what matters. Every method here returns `{ data, error }` rather than
// rejecting, so a swallowed `error` would look exactly like an empty collection — the user's
// catches silently gone, with no failure anywhere. Since T-165 the offline store treats a throw as
// "stay queued and retry"; returning empty instead would make it discard the outbox as delivered.

function fakeClient(result: { data?: unknown; error?: { message: string } }) {
  const calls: Record<string, unknown>[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'upsert']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  // maybeSingle and the awaited builder both resolve to the result.
  builder.maybeSingle = async () => result;
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const client = {
    calls,
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return builder;
    },
  };
  return client;
}

const ROW: CollectionRow = {
  user_id: 'u1',
  species_id: 'red-fox',
  spotted_at: '2026-05-01T10:00:00.000Z',
  caught_at: null,
  helped_at: null,
  helped_kind: null,
  prime_bonus: false,
};

describe('SupabaseCollectionGateway', () => {
  it('reads the whole collection for one user', async () => {
    const client = fakeClient({ data: [ROW] });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    expect(await gw.selectAll('u1')).toEqual([ROW]);
    expect(client.calls).toContainEqual({ method: 'from', args: ['collection'] });
    expect(client.calls).toContainEqual({ method: 'eq', args: ['user_id', 'u1'] });
  });

  it('asks for exactly the columns the record needs', async () => {
    // A column dropped from the select turns into a silently-null field on every record.
    const client = fakeClient({ data: [] });
    await new SupabaseCollectionGateway(client as unknown as SupabaseClient).selectAll('u1');
    expect(client.calls).toContainEqual({ method: 'select', args: [COLLECTION_COLUMNS] });
  });

  it('returns an empty list rather than null when the user has nothing yet', async () => {
    const client = fakeClient({ data: null });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    expect(await gw.selectAll('u1')).toEqual([]);
  });

  it('throws when the read fails, so the outbox is not discarded as delivered', async () => {
    const client = fakeClient({ error: { message: 'permission denied' } });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    await expect(gw.selectAll('u1')).rejects.toThrow(/selectAll failed: permission denied/);
  });

  it('reads one species scoped to both user and species', async () => {
    const client = fakeClient({ data: ROW });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    expect(await gw.selectOne('u1', 'red-fox')).toEqual(ROW);
    expect(client.calls).toContainEqual({ method: 'eq', args: ['species_id', 'red-fox'] });
  });

  it('returns null for a species the user has never touched', async () => {
    const client = fakeClient({ data: null });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    expect(await gw.selectOne('u1', 'nothing')).toBeNull();
  });

  it('throws when the single read fails', async () => {
    const client = fakeClient({ error: { message: 'boom' } });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    await expect(gw.selectOne('u1', 'red-fox')).rejects.toThrow(/selectOne failed: boom/);
  });

  it('upserts on the composite key so a second catch updates rather than duplicates', async () => {
    const client = fakeClient({});
    await new SupabaseCollectionGateway(client as unknown as SupabaseClient).upsertOne(ROW);
    expect(client.calls).toContainEqual({
      method: 'upsert',
      args: [ROW, { onConflict: 'user_id,species_id' }],
    });
  });

  it('throws when the write fails, so the record stays queued for retry', async () => {
    // The most important case: a swallowed write error means the offline store drops the op from
    // its outbox believing it landed, and the catch is gone for good.
    const client = fakeClient({ error: { message: 'row level security' } });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    await expect(gw.upsertOne(ROW)).rejects.toThrow(/upsert failed: row level security/);
  });

  it('reports the free-catch trigger as a refusal, not a retryable failure (T-200)', async () => {
    const client = fakeClient({ error: { message: 'free_catch_limit' } });
    const gw = new SupabaseCollectionGateway(client as unknown as SupabaseClient);
    const err = await gw.upsertOne(ROW).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CatchRefusedError);
    expect((err as CatchRefusedError).speciesId).toBe(ROW.species_id);
  });
});
