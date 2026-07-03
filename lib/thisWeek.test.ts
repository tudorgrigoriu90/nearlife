import { thisWeek } from './thisWeek';
import type { Species } from './species/types';

function sp(id: string, rarity: Species['rarity'], activeMonths: number[]): Species {
  return {
    id,
    scientificName: `Genus ${id}`,
    commonName: id,
    category: 'bird',
    rarity,
    activeMonths: activeMonths as Species['activeMonths'],
  };
}

const swiftSummer = sp('swift', 'common', [6, 7, 8]);
const spruceAllYear = sp('spruce', 'common', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const ospreyRareSummer = sp('osprey', 'rare', [6, 7, 8]);
const craneUncommonSummer = sp('crane', 'uncommon', [6, 7, 8]);

describe('thisWeek', () => {
  it('includes only species active in the month', () => {
    const list = [swiftSummer, spruceAllYear];
    const jan = thisWeek(list, 1, new Set());
    expect(jan.map((e) => e.species.id)).toEqual(['spruce']);
  });

  it('flags not-yet-collected species as NEW and puts them first', () => {
    const list = [swiftSummer, spruceAllYear];
    const collected = new Set(['swift']);
    const result = thisWeek(list, 7, collected);
    expect(result.find((e) => e.species.id === 'swift')?.isNew).toBe(false);
    expect(result.find((e) => e.species.id === 'spruce')?.isNew).toBe(true);
    expect(result[0].species.id).toBe('spruce'); // new first
  });

  it('orders rarer species before common within the same NEW group', () => {
    const list = [swiftSummer, craneUncommonSummer, ospreyRareSummer];
    const result = thisWeek(list, 7, new Set());
    expect(result.map((e) => e.species.id)).toEqual(['osprey', 'crane', 'swift']);
  });

  it('is stable for species with equal new-ness and rarity', () => {
    const a = sp('a', 'common', [7]);
    const b = sp('b', 'common', [7]);
    const result = thisWeek([a, b], 7, new Set());
    expect(result.map((e) => e.species.id)).toEqual(['a', 'b']);
  });

  it('returns an empty list for a quiet month', () => {
    expect(thisWeek([swiftSummer], 1, new Set())).toEqual([]);
  });
});
