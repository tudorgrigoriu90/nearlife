import {
  contentRowToContent,
  HardcodedSpeciesRepository,
  minigameCategory,
  speciesRowToSpecies,
  SupabaseSpeciesRepository,
  type SpeciesContentRow,
  type SpeciesGateway,
  type SpeciesRow,
} from './speciesRepository';

describe('HardcodedSpeciesRepository', () => {
  const repo = new HardcodedSpeciesRepository();

  it('lists the curated catalogue with localized names', async () => {
    const en = await repo.listSpecies('en');
    expect(en.length).toBeGreaterThan(50);
    const robin = en.find((e) => e.species.id === 'european-robin');
    expect(robin?.commonName).toBe('European Robin');

    const sv = await repo.listSpecies('sv');
    expect(sv.find((e) => e.species.id === 'european-robin')?.commonName).toBe('Rödhake');
  });

  it('returns localized content, null for an unknown species', async () => {
    const content = await repo.getContent('european-robin', 'en');
    expect(content?.fact).toMatch(/territorial/i);
    expect(await repo.getContent('no-such-species', 'en')).toBeNull();
  });

  it('stands in its bundled set for any county catalogue', async () => {
    expect((await repo.regionCatalogue('SWE.13_1', 'sv')).length).toBeGreaterThan(50);
  });

  it('describes requested species in order, localized, skipping unknown ids', async () => {
    const out = await repo.describeSpecies(['european-robin', 'ghost', 'mallard'], 'sv');
    expect(out.map((s) => s.species.id)).toEqual(['european-robin', 'mallard']);
    expect(out[0].commonName).toBe('Rödhake');
    expect(out[0].detail).toEqual(expect.any(String));
  });
});

describe('row mapping', () => {
  it('maps a species row and sorts active months', () => {
    const row: SpeciesRow = {
      id: 'pike', scientific_name: 'Esox lucius', common_name: 'Northern Pike',
      category: 'fish', rarity: 'common', active_months: [7, 4, 5],
    };
    expect(speciesRowToSpecies(row)).toEqual({
      id: 'pike', scientificName: 'Esox lucius', commonName: 'Northern Pike',
      category: 'fish', rarity: 'common', activeMonths: [4, 5, 7],
    });
  });

  it('maps a content row (when_how → whenAndHow)', () => {
    const row: SpeciesContentRow = {
      species_id: 'pike', locale: 'en', common_name: 'Northern Pike',
      fact: 'f', when_how: 'w', give: 'g', protect: 'p',
    };
    expect(contentRowToContent(row)).toEqual({ speciesId: 'pike', fact: 'f', whenAndHow: 'w', give: 'g', protect: 'p' });
  });

  it('maps a null fact (no article, T-146) to an empty string, keeping the mission content', () => {
    const row: SpeciesContentRow = {
      species_id: 'gbif:999', locale: 'en', common_name: null,
      fact: null, when_how: 'w', give: 'g', protect: 'p',
    };
    const content = contentRowToContent(row);
    expect(content.fact).toBe(''); // card treats empty as "no fact" and hides that block
    expect(content.give).toBe('g'); // mission is still free for every species (invariant #2)
    expect(content.protect).toBe('p');
  });
});

describe('SupabaseSpeciesRepository', () => {
  const speciesRows: SpeciesRow[] = [
    { id: 'pike', scientific_name: 'Esox lucius', common_name: 'Northern Pike', category: 'fish', rarity: 'common', active_months: [5, 6] },
  ];
  const contentRows: Record<string, SpeciesContentRow> = {
    'pike|en': { species_id: 'pike', locale: 'en', common_name: 'Northern Pike', fact: 'en fact', when_how: 'w', give: 'g', protect: 'p' },
  };
  const gateway: SpeciesGateway = {
    fetchSpecies: async () => speciesRows,
    fetchContent: async (id, locale) => contentRows[`${id}|${locale}`] ?? null,
    fetchPresence: async (regionId) =>
      regionId === 'SWE.9_1'
        ? [{ species_id: 'pike', active_months: [6, 5], occurrences: 42 }]
        : [],
    fetchSpeciesByIds: async (ids) => [
      ...speciesRows,
      { id: 'frog', scientific_name: 'Rana temporaria', common_name: null, category: null, rarity: 'common' as const, active_months: [4], taxon_group: 'amphibian' },
    ].filter((r) => ids.includes(r.id)),
    fetchContentSummaries: async (ids, locales) =>
      [
        { species_id: 'pike', locale: 'en', common_name: 'Northern Pike', when_how: 'en how' },
        { species_id: 'pike', locale: 'sv', common_name: 'Gädda', when_how: 'sv hur' },
        { species_id: 'frog', locale: 'en', common_name: 'Common frog', when_how: 'en frog' },
      ].filter((c) => ids.includes(c.species_id) && locales.includes(c.locale)),
    fetchRegionCatalogue: async (regionId, locale) =>
      regionId === 'SWE.9_1'
        ? [
            { id: 'pike', scientific_name: 'Esox lucius', common_name: 'Northern Pike', local_name: locale === 'sv' ? 'Gädda' : 'Northern Pike', category: 'fish', rarity: 'common', taxon_group: 'fish', active_months: [6, 5], occurrences: 42 },
            { id: 'frog', scientific_name: 'Rana temporaria', common_name: null, local_name: null, category: null, rarity: 'common', taxon_group: 'amphibian', active_months: [4], occurrences: 3 },
          ]
        : [],
  };
  const repo = new SupabaseSpeciesRepository(gateway);

  it('lists species from the gateway with localized names', async () => {
    const list = await repo.listSpecies('en');
    expect(list.map((e) => e.species.id)).toEqual(['pike']);
    expect(list[0].commonName).toBe('Northern Pike');
  });

  it('falls back to English content when the locale has no row', async () => {
    // No 'sv' row for pike → falls back to the 'en' row.
    const content = await repo.getContent('pike', 'sv');
    expect(content?.fact).toBe('en fact');
  });

  it('returns null when neither the locale nor English has content', async () => {
    expect(await repo.getContent('ghost', 'sv')).toBeNull();
  });

  it('describes species in the locale, falling back to English then the binomial', async () => {
    const out = await repo.describeSpecies(['frog', 'pike', 'ghost'], 'sv');
    expect(out).toEqual([
      expect.objectContaining({ commonName: 'Common frog', detail: 'en frog' }),
      expect.objectContaining({ commonName: 'Gädda', detail: 'sv hur' }),
    ]);
    expect(out[0].species.category).toBe('mammal'); // a frog is caught by stealth
    expect(await repo.describeSpecies([], 'sv')).toEqual([]);
  });

  it('reads a county catalogue with names in the reader\'s language (T-208)', async () => {
    const [pike, frog] = await repo.regionCatalogue('SWE.9_1', 'sv');
    expect(pike.names).toEqual({ sv: 'Gädda' });
    expect(pike.activeMonths).toEqual([5, 6]); // the county's own window, sorted
    expect(frog.names).toBeUndefined(); // no name anywhere → binomial, shown as one
    expect(frog.commonName).toBe('Rana temporaria');
    expect(frog.category).toBe('mammal');
  });

  it('puts the described name on the species too, so its card is titled in that language', async () => {
    const [pike] = await repo.describeSpecies(['pike'], 'sv');
    expect(pike.species.names).toEqual({ sv: 'Gädda' });
  });

  it('reads region presence and sorts the active months', async () => {
    const presence = await repo.regionPresence('SWE.9_1');
    expect(presence).toEqual([{ speciesId: 'pike', activeMonths: [5, 6], occurrences: 42 }]);
    expect(await repo.regionPresence('SWE.13_1')).toEqual([]);
  });
});

// T-196: species.common_name is nullable now that the GBIF catalogue is loaded — most of its
// 11,936 species have no common name in any language. The row mapper has to produce something
// renderable without reinstating the lie T-187 removed.
describe('speciesRowToSpecies with no common name', () => {
  const row = {
    id: 'gbif:2426805',
    scientific_name: 'Rana temporaria',
    common_name: null,
    category: 'amphibian',
    rarity: 'common',
    active_months: [4, 5, 6],
  };

  it('falls back to the scientific name so the card has a title', () => {
    expect(speciesRowToSpecies(row as never).commonName).toBe('Rana temporaria');
  });

  it('still prefers a real common name when there is one', () => {
    expect(
      speciesRowToSpecies({ ...row, common_name: 'Common frog' } as never).commonName,
    ).toBe('Common frog');
  });

  it('treats a blank name as absent rather than rendering an empty title', () => {
    expect(speciesRowToSpecies({ ...row, common_name: '   ' } as never).commonName).toBe(
      'Rana temporaria',
    );
  });
});

// T-207: four GBIF groups have no curated category, and every species must still open a minigame.
describe('minigameCategory', () => {
  it('keeps a curated category', () => {
    expect(minigameCategory({ category: 'bird', taxon_group: 'bird' })).toBe('bird');
  });

  it('maps the groups with no minigame of their own by how the animal moves', () => {
    expect(minigameCategory({ category: null, taxon_group: 'amphibian' })).toBe('mammal');
    expect(minigameCategory({ category: null, taxon_group: 'reptile' })).toBe('mammal');
    expect(minigameCategory({ category: null, taxon_group: 'arachnid' })).toBe('insect');
    expect(minigameCategory({ category: null, taxon_group: 'mollusc' })).toBe('plant');
  });

  it('never returns nothing, even for an unknown or missing group', () => {
    expect(minigameCategory({ category: null, taxon_group: null })).toBe('plant');
    expect(minigameCategory({ category: null })).toBe('plant');
  });
});
