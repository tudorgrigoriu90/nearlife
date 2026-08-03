import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSpeciesGateway } from './speciesRepository';

// A minimal chainable stub of the supabase-js query builder: select/eq return the builder, the
// builder is awaitable (thenable → {data,error}), and maybeSingle resolves the same. This exercises
// the real SupabaseSpeciesGateway adapter (the production DB read paths) without a live database.
function fakeClient(byTable: Record<string, { data: unknown; error: { message: string } | null }>) {
  const build = (table: string) => {
    const resp = byTable[table];
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      maybeSingle: async () => resp,
      then: (resolve: (v: unknown) => void) => resolve(resp),
    };
    return b;
  };
  return { from: (table: string) => build(table) } as unknown as SupabaseClient;
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

  it('throws with a helpful message on a query error', async () => {
    const gw = new SupabaseSpeciesGateway(
      fakeClient({ species: { data: null, error: { message: 'boom' } } }),
    );
    await expect(gw.fetchSpecies()).rejects.toThrow(/species fetch failed: boom/);
  });
});
