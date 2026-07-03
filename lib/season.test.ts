import { activeSpecies, isActiveInMonth, monthOf, seasonKeyOf, seasonOf } from './season';
import type { Species } from './species/types';

const swift: Species = {
  id: 'common-swift',
  scientificName: 'Apus apus',
  commonName: 'Common Swift',
  category: 'bird',
  rarity: 'common',
  activeMonths: [5, 6, 7, 8],
};

const spruce: Species = {
  id: 'norway-spruce',
  scientificName: 'Picea abies',
  commonName: 'Norway Spruce',
  category: 'plant',
  rarity: 'common',
  activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

describe('monthOf', () => {
  it('returns 1-indexed months', () => {
    expect(monthOf(new Date('2026-01-15T12:00:00Z'))).toBe(1);
    expect(monthOf(new Date('2026-07-03T12:00:00Z'))).toBe(7);
    expect(monthOf(new Date('2026-12-31T12:00:00Z'))).toBe(12);
  });
});

describe('seasonOf', () => {
  it('maps months to meteorological seasons', () => {
    expect(seasonOf(12)).toBe('winter');
    expect(seasonOf(1)).toBe('winter');
    expect(seasonOf(2)).toBe('winter');
    expect(seasonOf(3)).toBe('spring');
    expect(seasonOf(5)).toBe('spring');
    expect(seasonOf(6)).toBe('summer');
    expect(seasonOf(8)).toBe('summer');
    expect(seasonOf(9)).toBe('autumn');
    expect(seasonOf(11)).toBe('autumn');
  });
});

describe('seasonKeyOf', () => {
  it('groups a winter that spans the year boundary into one key', () => {
    const dec = seasonKeyOf(new Date('2026-12-20T12:00:00Z'));
    const jan = seasonKeyOf(new Date('2027-01-10T12:00:00Z'));
    const feb = seasonKeyOf(new Date('2027-02-10T12:00:00Z'));
    expect(dec).toBe('2027-winter');
    expect(jan).toBe('2027-winter');
    expect(feb).toBe('2027-winter');
  });

  it('gives distinct keys for different seasons', () => {
    expect(seasonKeyOf(new Date('2026-07-03T12:00:00Z'))).toBe('2026-summer');
    expect(seasonKeyOf(new Date('2026-04-03T12:00:00Z'))).toBe('2026-spring');
    expect(seasonKeyOf(new Date('2026-07-03'))).not.toBe(seasonKeyOf(new Date('2026-04-03')));
  });
});

describe('isActiveInMonth / activeSpecies', () => {
  it('gates a migrant to its season', () => {
    expect(isActiveInMonth(swift, 7)).toBe(true);
    expect(isActiveInMonth(swift, 1)).toBe(false);
  });

  it('keeps a year-round species active every month', () => {
    for (let m = 1 as const; m <= 12; m++) {
      expect(isActiveInMonth(spruce, m as never)).toBe(true);
    }
  });

  it('filters a list to those active in the month, preserving order', () => {
    const list = [swift, spruce];
    expect(activeSpecies(list, 7)).toEqual([swift, spruce]);
    expect(activeSpecies(list, 1)).toEqual([spruce]);
  });
});
