import {
  FULL_GAME_ENTITLEMENT,
  NO_ENTITLEMENTS,
  SupabaseEntitlementSource,
  type EntitlementClient,
  parseEntitlements,
  resolveEntitlements,
  serializeEntitlements,
} from './entitlement';

describe('resolveEntitlements', () => {
  it('is locked with no active entitlements', () => {
    expect(resolveEntitlements([])).toEqual(NO_ENTITLEMENTS);
    expect(resolveEntitlements([]).fullGame).toBe(false);
  });

  it('unlocks Full Game when its entitlement is active', () => {
    expect(resolveEntitlements([FULL_GAME_ENTITLEMENT]).fullGame).toBe(true);
  });

  it('ignores unrelated entitlement ids', () => {
    expect(resolveEntitlements(['something_else']).fullGame).toBe(false);
    expect(resolveEntitlements(['something_else', FULL_GAME_ENTITLEMENT]).fullGame).toBe(true);
  });
});

describe('resolveEntitlements: Family and regions (T-083, T-102, T-105)', () => {
  it('Family includes the Full Game', () => {
    const e = resolveEntitlements(['family']);
    expect(e.fullGame).toBe(true);
    expect(e.family).toBe(true);
  });

  it('a household member gets the Full Game from the profile, without owning a purchase', () => {
    // profiles.full_game is derived server-side and is the only place household membership shows.
    expect(resolveEntitlements([], true)).toEqual({ ...NO_ENTITLEMENTS, fullGame: true });
  });

  it('maps county packs back to county ids and recognises the all-Sweden pass', () => {
    const e = resolveEntitlements(['region_SWE_9_1', 'region_SWE_12_1', 'all_regions']);
    expect(e.regions).toEqual(['SWE.12_1', 'SWE.9_1']);
    expect(e.allRegions).toBe(true);
  });
});

describe('cached entitlements', () => {
  it('round-trips through the cache format', () => {
    const e = resolveEntitlements(['family', 'region_SWE_9_1']);
    expect(parseEntitlements(serializeEntitlements(e))).toEqual(e);
  });

  it('decays corrupt or missing data to locked, never to unlocked', () => {
    expect(parseEntitlements(null)).toEqual(NO_ENTITLEMENTS);
    expect(parseEntitlements('{broken')).toEqual(NO_ENTITLEMENTS);
    expect(parseEntitlements('{"fullGame":"yes"}')).toEqual(NO_ENTITLEMENTS);
    expect(parseEntitlements('{"fullGame":true,"regions":[1]}').regions).toEqual([]);
  });
});

describe('SupabaseEntitlementSource', () => {
  function client(profile: unknown, rows: unknown, errors: { profile?: string; rows?: string } = {}) {
    const from = jest.fn((table: string) => {
      const result =
        table === 'profiles'
          ? { data: profile, error: errors.profile ? { message: errors.profile } : null }
          : { data: rows, error: errors.rows ? { message: errors.rows } : null };
      // A real promise with the query-builder methods on it: awaiting it ends the chain.
      const chain: object = Object.assign(Promise.resolve(result), {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve(result),
      });
      return chain;
    });
    return { from } as unknown as EntitlementClient;
  }

  it('combines the derived profile flag with the active entitlement rows', async () => {
    const source = new SupabaseEntitlementSource(
      client({ full_game: true }, [{ entitlement: 'region_SWE_9_1' }]),
      async () => 'user-1',
    );
    await expect(source.fetch()).resolves.toEqual({
      fullGame: true,
      family: false,
      allRegions: false,
      regions: ['SWE.9_1'],
    });
  });

  it('treats a missing profile as locked', async () => {
    const source = new SupabaseEntitlementSource(client(null, []), async () => 'user-1');
    await expect(source.fetch()).resolves.toEqual(NO_ENTITLEMENTS);
  });

  it('throws on a read error, so the caller keeps the cached state', async () => {
    const source = new SupabaseEntitlementSource(client(null, [], { profile: 'offline' }), async () => 'u');
    await expect(source.fetch()).rejects.toThrow('offline');
  });
});
