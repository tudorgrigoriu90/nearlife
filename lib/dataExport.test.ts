import { buildDataExport, EXPORT_FORMAT, exportToJson, householdForExport, SupabaseExportSource } from './dataExport';
import type { Household } from './family';
import { DEFAULT_CONSENT, grant } from './consent';
import type { CollectionRecord } from './collection';

const collection: CollectionRecord[] = [
  { speciesId: 'pike', spottedAt: 't', caughtAt: 't', helpedAt: null, helpedKind: null, primeBonus: true },
  { speciesId: 'barn-swallow', spottedAt: 't', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false },
];

describe('buildDataExport', () => {
  it('bundles the user data in a stable, versioned shape', () => {
    const data = buildDataExport({
      exportedAt: '2026-07-05T00:00:00.000Z',
      profile: { homeRegion: 'kronoberg' },
      consent: grant(DEFAULT_CONSENT, 'analytics'),
      collection,
    });
    expect(data.format).toBe(EXPORT_FORMAT);
    expect(data.profile.homeRegion).toBe('kronoberg');
    expect(data.consent.analytics).toBe(true);
    // deterministic: collection sorted by species id
    expect(data.collection.map((r) => r.speciesId)).toEqual(['barn-swallow', 'pike']);
  });

  it('does not alias the input collection', () => {
    const data = buildDataExport({
      exportedAt: 't', profile: { homeRegion: null }, consent: DEFAULT_CONSENT, collection,
    });
    data.collection[0].spottedAt = 'mutated';
    expect(collection.find((r) => r.speciesId === 'barn-swallow')?.spottedAt).toBe('t');
  });

  it('serializes to valid JSON', () => {
    const data = buildDataExport({
      exportedAt: 't', profile: { homeRegion: null }, consent: DEFAULT_CONSENT, collection: [],
    });
    expect(JSON.parse(exportToJson(data))).toEqual(data);
  });
});

describe('purchases and Family in the export (T-219)', () => {
  const base = { exportedAt: 't', profile: { homeRegion: null }, consent: DEFAULT_CONSENT, collection: [] };

  it('an account with neither exports an empty list and no household', () => {
    const data = buildDataExport(base);
    expect(data.purchases).toEqual([]);
    expect(data.household).toBeNull();
  });

  it('names a section it could not read instead of passing it off as empty', () => {
    expect(buildDataExport({ ...base, unavailable: ['purchases'] }).unavailable).toEqual(['purchases']);
    expect('unavailable' in buildDataExport({ ...base, unavailable: [] })).toBe(false);
  });

  it('lists every purchase record the server holds, refunded ones too, sorted', () => {
    const data = buildDataExport({
      ...base,
      purchases: [
        { entitlement: 'region_SWE_13_1', productId: 'region_swe_13', active: false, changedAt: '2026-10-30T09:00:00Z' },
        { entitlement: 'full_game', productId: 'full_game', active: true, changedAt: '2026-10-29T09:00:00Z' },
      ],
    });
    expect(data.purchases.map((p) => [p.entitlement, p.active])).toEqual([
      ['full_game', true],
      ['region_SWE_13_1', false],
    ]);
  });

  const owner: Household = {
    role: 'owner',
    since: '2026-10-28T09:00:00Z',
    people: 3,
    active: true,
    inviteCode: 'ABCD2345',
    members: [
      { id: '5e6763d4-aaaa-4bbb-8ccc-ddddeeeeffff', joinedAt: '2026-10-29T10:00:00Z' },
      { id: '0e08dc15-1111-4222-8333-444455556666', joinedAt: '2026-10-30T10:00:00Z' },
    ],
  };

  it("an owner's export has the household and its code, but never the members' account ids", () => {
    const h = householdForExport(owner);
    expect(h).toEqual({
      role: 'owner',
      since: '2026-10-28T09:00:00Z',
      people: 3,
      active: true,
      inviteCode: 'ABCD2345',
      memberJoinDates: ['2026-10-29T10:00:00Z', '2026-10-30T10:00:00Z'],
    });
    const json = exportToJson(buildDataExport({ ...base, household: h }));
    expect(json).not.toContain('5e6763d4');
    expect(json).not.toContain('0e08dc15');
  });

  it("a member's export has their role and join date, and no code", () => {
    expect(
      householdForExport({ role: 'member', since: '2026-10-29T10:00:00Z', people: 3, active: true, inviteCode: null, members: [] }),
    ).toEqual({ role: 'member', since: '2026-10-29T10:00:00Z', people: 3, active: true, inviteCode: null, memberJoinDates: [] });
    expect(householdForExport(null)).toBeNull();
  });
});

describe('SupabaseExportSource (T-219)', () => {
  function client(result: { data: unknown; error: { message: string } | null }) {
    const calls: unknown[][] = [];
    return {
      calls,
      from: (table: string) => ({
        select: (cols: string) => ({
          eq: (col: string, val: unknown) => {
            calls.push([table, cols, col, val]);
            return Promise.resolve(result);
          },
        }),
      }),
    };
  }

  it("reads the user's own purchase records", async () => {
    const c = client({
      data: [{ entitlement: 'family', product_id: 'family', active: true, changed_at: '2026-10-29T09:00:00Z' }],
      error: null,
    });
    const source = new SupabaseExportSource(c, async () => 'u1');
    await expect(source.purchases()).resolves.toEqual([
      { entitlement: 'family', productId: 'family', active: true, changedAt: '2026-10-29T09:00:00Z' },
    ]);
    expect(c.calls).toEqual([['entitlements', 'entitlement,product_id,active,changed_at', 'user_id', 'u1']]);
  });

  it('fails rather than export an incomplete bundle', async () => {
    const source = new SupabaseExportSource(client({ data: null, error: { message: 'boom' } }), async () => 'u1');
    await expect(source.purchases()).rejects.toThrow('boom');
  });

  it('skips malformed rows', async () => {
    const c = client({ data: [{ entitlement: 7 }, { entitlement: 'full_game', product_id: null, active: true, changed_at: 't' }], error: null });
    await expect(new SupabaseExportSource(c, async () => 'u1').purchases()).resolves.toEqual([
      { entitlement: 'full_game', productId: null, active: true, changedAt: 't' },
    ]);
  });
});
