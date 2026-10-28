import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSpeciesGateway } from './speciesRepository';

// A minimal chainable stub of the supabase-js query builder: select/eq return the builder, the
// builder is awaitable (thenable → {data,error}), and maybeSingle resolves the same. This exercises
// the real SupabaseSpeciesGateway adapter (the production DB read paths) without a live database.
function fakeClient(byTable: Record<string, { data: unknown; error: { message: string } | null }>) {
  const ranges: [string, number, number][] = [];
  const build = (table: string) => {
    let resp = byTable[table];
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      order: () => b,
      // Like PostgREST: hand back only the requested window of the table's rows.
      range: (from: number, to: number) => {
        ranges.push([table, from, to]);
        if (Array.isArray(resp?.data)) resp = { ...resp, data: (resp.data as unknown[]).slice(from, to + 1) };
        return b;
      },
      maybeSingle: async () => resp,
      then: (resolve: (v: unknown) => void) => resolve(resp),
    };
    return b;
  };
  const client = {
    from: (table: string) => build(table),
    rpc: (fn: string) => build(fn),
  } as unknown as SupabaseClient;
  return Object.assign(client, { ranges });
}

describe('SupabaseSpeciesGateway', () => {
  it('fetches species / content / presence rows on success', async () => {
    const gw = new SupabaseSpeciesGateway(
      fakeClient({
        species: { data: [{ id: 'gbif:1', scientific_name: 'X y', common_name: 'X', category: 'bird', rarity: 'common', active_months: [5] }], error: null },
        species_content: { data: { species_id: 'gbif:1', locale: 'en', common_name: null, fact: 'f', when_how: 'w', give: 'g', protect: 'p' }, error: null },
        species_presence: { data: [{ species_id: 'gbif:1', active_months: [5, 6], occurrences: 10 }], error: null },
      }),
    );
    expect(await gw.fetchSpecies()).toHaveLength(1);
    expect((await gw.fetchContent('gbif:1', 'en'))?.fact).toBe('f');
    expect(await gw.fetchPresence('SWE.9_1')).toHaveLength(1);
  });

  it('returns empty/null when there is no data', async () => {
    const gw = new SupabaseSpeciesGateway(
      fakeClient({
        species: { data: null, error: null },
        species_content: { data: null, error: null },
        species_presence: { data: null, error: null },
      }),
    );
    expect(await gw.fetchSpecies()).toEqual([]);
    expect(await gw.fetchContent('x', 'en')).toBeNull();
    expect(await gw.fetchPresence('r')).toEqual([]);
  });

  it('pages past the 1,000-row cap instead of silently stopping there', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ species_id: `s${i}`, active_months: [5], occurrences: 1 }));
    const client = fakeClient({ species_presence: { data: rows, error: null } });
    const presence = await new SupabaseSpeciesGateway(client).fetchPresence('SWE.9_1');
    expect(presence).toHaveLength(2500);
    expect(client.ranges).toEqual([
      ['species_presence', 0, 999],
      ['species_presence', 1000, 1999],
      ['species_presence', 2000, 2999],
    ]);
  });

  it('reads species and content summaries by id, in chunks', async () => {
    const ids = Array.from({ length: 400 }, (_, i) => `s${i}`);
    const client = fakeClient({
      species: { data: [{ id: 's1' }], error: null },
      species_content: { data: [{ species_id: 's1', locale: 'en', common_name: 'A', when_how: 'w' }], error: null },
    });
    const gw = new SupabaseSpeciesGateway(client);
    expect(await gw.fetchSpeciesByIds(ids)).toHaveLength(3); // one row per chunk of 150 from the fake
    expect(await gw.fetchContentSummaries(ids.slice(0, 10), ['sv', 'en'])).toHaveLength(1);
  });

  it('pages the county catalogue function past 1,000 rows', async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ id: `s${i}` }));
    const client = fakeClient({ region_catalogue: { data: rows, error: null } });
    expect(await new SupabaseSpeciesGateway(client).fetchRegionCatalogue('SWE.9_1', 'sv')).toHaveLength(1500);
    expect(client.ranges.map((r) => r[1])).toEqual([0, 1000]);
  });

  it('throws with a helpful message on a query error', async () => {
    const gw = new SupabaseSpeciesGateway(
      fakeClient({ species: { data: null, error: { message: 'boom' } } }),
    );
    await expect(gw.fetchSpecies()).rejects.toThrow(/species fetch failed: boom/);
    await expect(gw.fetchSpeciesByIds(['a'])).rejects.toThrow(/species fetch failed: boom/);
  });
});
