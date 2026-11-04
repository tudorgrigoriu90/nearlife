import {
  almanacEntries,
  categoryCounts,
  discoveredCount,
  matchesName,
  ALMANAC_CATEGORIES,
} from './almanac';
import { isActiveInSeason } from './season';
import { KRONOBERG_SPECIES } from './species/kronoberg';
import type { CollectionRecord } from './collection';
import type { Species } from './species/types';

const species: Species[] = [
  {
    id: 'a-bird',
    scientificName: 'A a',
    commonName: 'A',
    category: 'bird',
    rarity: 'common',
    activeMonths: [5],
  },
  {
    id: 'b-bird',
    scientificName: 'B b',
    commonName: 'B',
    category: 'bird',
    rarity: 'rare',
    activeMonths: [6],
  },
  {
    id: 'c-plant',
    scientificName: 'C c',
    commonName: 'C',
    category: 'plant',
    rarity: 'common',
    activeMonths: [7],
  },
];

function record(patch: Partial<CollectionRecord> & { speciesId: string }): CollectionRecord {
  return {
    speciesId: patch.speciesId,
    spottedAt: patch.spottedAt ?? null,
    caughtAt: patch.caughtAt ?? null,
    helpedAt: patch.helpedAt ?? null,
    helpedKind: patch.helpedKind ?? null,
    primeBonus: patch.primeBonus ?? false,
  };
}

describe('almanacEntries', () => {
  it('returns every species in input order with an empty tier state when nothing is collected', () => {
    const entries = almanacEntries(species, []);
    expect(entries.map((e) => e.species.id)).toEqual(['a-bird', 'b-bird', 'c-plant']);
    expect(entries.every((e) => !e.discovered)).toBe(true);
    expect(entries[0].tier).toEqual({ spotted: false, caught: false, helped: false });
  });

  it('marks discovered species and reflects the caught/helped overlay', () => {
    const records = [record({ speciesId: 'a-bird', spottedAt: 't', caughtAt: 't' })];
    const entries = almanacEntries(species, records);
    const a = entries.find((e) => e.species.id === 'a-bird')!;
    expect(a.discovered).toBe(true);
    expect(a.tier).toEqual({ spotted: true, caught: true, helped: false });
    expect(entries.find((e) => e.species.id === 'b-bird')!.discovered).toBe(false);
  });

  it('filters to a single category when requested', () => {
    const entries = almanacEntries(species, [], 'bird');
    expect(entries.map((e) => e.species.id)).toEqual(['a-bird', 'b-bird']);
  });

  it('narrows to species active in the given month (T-057)', () => {
    expect(almanacEntries(species, [], undefined, 6).map((e) => e.species.id)).toEqual(['b-bird']);
  });

  it('combines the month filter with the category filter', () => {
    expect(almanacEntries(species, [], 'plant', 7).map((e) => e.species.id)).toEqual(['c-plant']);
    expect(almanacEntries(species, [], 'plant', 6)).toEqual([]);
  });
});

describe('categoryCounts', () => {
  it('reports totals and discovered per present category, in ALMANAC_CATEGORIES order', () => {
    const records = [record({ speciesId: 'b-bird', spottedAt: 't' })];
    const counts = categoryCounts(species, records);
    expect(counts).toEqual([
      { category: 'bird', total: 2, discovered: 1 },
      { category: 'plant', total: 1, discovered: 0 },
    ]);
    // categories with no species are omitted (fish/fungus/insect/mammal absent here).
    expect(counts.map((c) => c.category)).not.toContain('fish');
  });

  it('orders categories by the canonical ALMANAC_CATEGORIES list', () => {
    const counts = categoryCounts(species, []);
    const order = counts.map((c) => ALMANAC_CATEGORIES.indexOf(c.category));
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });
});

describe('discoveredCount', () => {
  it('counts spotted species across the whole almanac', () => {
    const records = [
      record({ speciesId: 'a-bird', spottedAt: 't' }),
      record({ speciesId: 'c-plant', spottedAt: 't', helpedAt: 't', helpedKind: 'give' }),
    ];
    expect(discoveredCount(species, records)).toBe(2);
  });

  it('is zero for an empty collection', () => {
    expect(discoveredCount(species, [])).toBe(0);
  });
});

describe('habitat filter (T-057)', () => {
  const pike = {
    ...KRONOBERG_SPECIES[0],
    id: 'pike',
    category: 'fish' as const,
    catchHabitats: ['freshwater' as const],
  };
  const duck = {
    ...KRONOBERG_SPECIES[0],
    id: 'duck',
    category: 'bird' as const,
    catchHabitats: ['land' as const, 'freshwater' as const],
  };
  const seal = {
    ...KRONOBERG_SPECIES[0],
    id: 'seal',
    category: 'mammal' as const,
    catchHabitats: ['coast' as const],
  };
  const bundledFish = {
    ...KRONOBERG_SPECIES[0],
    id: 'perch',
    category: 'fish' as const,
    catchHabitats: undefined,
  };

  it('keeps species that can be met in the chosen habitat', () => {
    const ids = (h: 'land' | 'freshwater' | 'coast') =>
      almanacEntries([pike, duck, seal], [], undefined, undefined, h).map((e) => e.species.id);
    expect(ids('freshwater')).toEqual(['pike', 'duck']);
    expect(ids('land')).toEqual(['duck']);
    expect(ids('coast')).toEqual(['seal']);
  });

  it('uses the cautious default for a species without habitat data (fish: water)', () => {
    expect(almanacEntries([bundledFish], [], undefined, undefined, 'land')).toEqual([]);
    expect(almanacEntries([bundledFish], [], undefined, undefined, 'freshwater')).toHaveLength(1);
  });
});

describe('season filter (T-240)', () => {
  const s = (id: string, activeMonths: number[]): Species =>
    ({
      id,
      scientificName: id,
      commonName: id,
      category: 'bird',
      rarity: 'common',
      activeMonths,
    }) as Species;
  const list = [
    s('winter-only', [1]),
    s('may', [5]),
    s('july', [7]),
    s('october', [10]),
    s('dec', [12]),
  ];

  it('keeps species active in any month of the season (meteorological, Dec–Feb is winter)', () => {
    const ids = (season: Parameters<typeof isActiveInSeason>[1]) =>
      list.filter((x) => isActiveInSeason(x, season)).map((x) => x.id);
    expect(ids('winter')).toEqual(['winter-only', 'dec']);
    expect(ids('spring')).toEqual(['may']);
    expect(ids('summer')).toEqual(['july']);
    expect(ids('autumn')).toEqual(['october']);
  });

  it('applies to undiscovered species too: a season says nothing about what they are', () => {
    const out = almanacEntries(list, [], undefined, undefined, undefined, { season: 'summer' });
    expect(out.map((e) => [e.species.id, e.discovered])).toEqual([['july', false]]);
  });
});

describe('name search (T-240)', () => {
  const heron: Species = {
    id: 'gbif:1',
    scientificName: 'Ardea cinerea',
    commonName: 'Grey Heron',
    category: 'bird',
    rarity: 'common',
    activeMonths: [5],
    names: { sv: 'Gråhäger' },
  };
  const jay: Species = {
    id: 'gbif:2',
    scientificName: 'Garrulus glandarius',
    commonName: 'Eurasian Jay',
    category: 'bird',
    rarity: 'common',
    activeMonths: [5],
    names: { sv: 'Nötskrika' },
  };
  const spotted = [record({ speciesId: 'gbif:1', spottedAt: '2026-05-01T00:00:00Z' })];

  it('matches the local, English and Latin names, ignoring case and accents', () => {
    expect(matchesName(heron, 'gråhä', 'sv')).toBe(true);
    expect(matchesName(heron, 'GRAHAGER', 'sv')).toBe(true);
    expect(matchesName(heron, 'heron', 'sv')).toBe(true);
    expect(matchesName(heron, 'ardea', 'sv')).toBe(true);
    expect(matchesName(heron, 'skrika', 'sv')).toBe(false);
  });

  it('only searches species already spotted, so the "?" cards stay a mystery (Director, 2026-11-04)', () => {
    const out = almanacEntries([heron, jay], spotted, undefined, undefined, undefined, {
      query: 'a',
      locale: 'sv',
    });
    expect(out.map((e) => e.species.id)).toEqual(['gbif:1']);
    // Searching for an undiscovered species by name finds nothing rather than revealing it.
    expect(
      almanacEntries([heron, jay], spotted, undefined, undefined, undefined, {
        query: 'nötskrika',
        locale: 'sv',
      }),
    ).toEqual([]);
  });

  it('a blank query filters nothing', () => {
    expect(
      almanacEntries([heron, jay], spotted, undefined, undefined, undefined, {
        query: '  ',
        locale: 'sv',
      }),
    ).toHaveLength(2);
  });
});
