import { almanacEntries, categoryCounts, discoveredCount, ALMANAC_CATEGORIES } from './almanac';
import { KRONOBERG_SPECIES } from './species/kronoberg';
import type { CollectionRecord } from './collection';
import type { Species } from './species/types';

const species: Species[] = [
  { id: 'a-bird', scientificName: 'A a', commonName: 'A', category: 'bird', rarity: 'common', activeMonths: [5] },
  { id: 'b-bird', scientificName: 'B b', commonName: 'B', category: 'bird', rarity: 'rare', activeMonths: [6] },
  { id: 'c-plant', scientificName: 'C c', commonName: 'C', category: 'plant', rarity: 'common', activeMonths: [7] },
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
  const pike = { ...KRONOBERG_SPECIES[0], id: 'pike', category: 'fish' as const, catchHabitats: ['freshwater' as const] };
  const duck = { ...KRONOBERG_SPECIES[0], id: 'duck', category: 'bird' as const, catchHabitats: ['land' as const, 'freshwater' as const] };
  const seal = { ...KRONOBERG_SPECIES[0], id: 'seal', category: 'mammal' as const, catchHabitats: ['coast' as const] };
  const bundledFish = { ...KRONOBERG_SPECIES[0], id: 'perch', category: 'fish' as const, catchHabitats: undefined };

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
