import {
  contentRowToContent,
  HardcodedSpeciesRepository,
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

  it('reads region presence and sorts the active months', async () => {
    const presence = await repo.regionPresence('SWE.9_1');
    expect(presence).toEqual([{ speciesId: 'pike', activeMonths: [5, 6], occurrences: 42 }]);
    expect(await repo.regionPresence('SWE.13_1')).toEqual([]);
  });
});
