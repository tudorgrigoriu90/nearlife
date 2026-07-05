import type { CollectionRecord } from './collection';
import {
  recordToRow,
  rowToRecord,
  SupabaseCollectionStore,
  type CollectionGateway,
  type CollectionRow,
} from './supabaseCollectionStore';

// A fake gateway backed by an in-memory map, so the store's mapping + transition logic is tested
// without a live DB. Records the last upsert so we can assert what was written.
class FakeGateway implements CollectionGateway {
  rows = new Map<string, CollectionRow>();
  upserts: CollectionRow[] = [];

  async selectAll(userId: string): Promise<CollectionRow[]> {
    return [...this.rows.values()].filter((r) => r.user_id === userId);
  }
  async selectOne(userId: string, speciesId: string): Promise<CollectionRow | null> {
    const r = this.rows.get(speciesId);
    return r && r.user_id === userId ? r : null;
  }
  async upsertOne(row: CollectionRow): Promise<void> {
    this.upserts.push(row);
    this.rows.set(row.species_id, row);
  }
}

const USER = 'user-1';
const store = (g: CollectionGateway) => new SupabaseCollectionStore(g, async () => USER);

describe('row mapping', () => {
  it('round-trips a record through the DB row shape', () => {
    const record: CollectionRecord = {
      speciesId: 'european-robin',
      spottedAt: '2026-05-01T00:00:00.000Z',
      caughtAt: '2026-05-02T00:00:00.000Z',
      helpedAt: null,
      helpedKind: null,
      primeBonus: true,
    };
    expect(rowToRecord(recordToRow(record, USER))).toEqual(record);
  });

  it('maps snake_case columns to the record and attaches the user id on the way out', () => {
    const row = recordToRow(
      { speciesId: 'pike', spottedAt: 't', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false },
      USER,
    );
    expect(row.user_id).toBe(USER);
    expect(row.species_id).toBe('pike');
    expect(row.spotted_at).toBe('t');
  });
});

describe('SupabaseCollectionStore', () => {
  it('persists a spotted mark and reads it back', async () => {
    const gateway = new FakeGateway();
    const s = store(gateway);
    await s.markSpotted('european-robin', 't1');

    expect(gateway.upserts).toHaveLength(1);
    expect(gateway.upserts[0]).toMatchObject({ user_id: USER, species_id: 'european-robin', spotted_at: 't1' });
    expect(await s.list()).toEqual([
      { speciesId: 'european-robin', spottedAt: 't1', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false },
    ]);
  });

  it('never overwrites an earlier spotted time', async () => {
    const gateway = new FakeGateway();
    const s = store(gateway);
    await s.markSpotted('pike', 'first');
    await s.markSpotted('pike', 'second');
    expect((await s.get('pike'))?.spottedAt).toBe('first');
  });

  it('catching implies spotted and records the prime bonus', async () => {
    const gateway = new FakeGateway();
    const s = store(gateway);
    const rec = await s.markCaught('pike', 'catch-time', true);
    expect(rec.spottedAt).toBe('catch-time');
    expect(rec.caughtAt).toBe('catch-time');
    expect(rec.primeBonus).toBe(true);
  });

  it("scopes reads to the caller's user id (RLS analogue)", async () => {
    const gateway = new FakeGateway();
    gateway.rows.set('otter', {
      user_id: 'someone-else', species_id: 'otter', spotted_at: 't',
      caught_at: null, helped_at: null, helped_kind: null, prime_bonus: false,
    });
    const s = store(gateway);
    expect(await s.get('otter')).toBeNull();
    expect(await s.list()).toEqual([]);
  });
});
