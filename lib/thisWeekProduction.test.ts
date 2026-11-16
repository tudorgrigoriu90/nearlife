import { thisWeekFromPresence } from './thisWeekProduction';
import type { RegionPresence } from './speciesRepository';

const common: RegionPresence = { speciesId: 'common', activeMonths: [6], occurrences: 5000 };
const rare: RegionPresence = { speciesId: 'rare', activeMonths: [6], occurrences: 20 };
const offSeason: RegionPresence = { speciesId: 'off', activeMonths: [1], occurrences: 100 };

describe('thisWeekFromPresence', () => {
  it('returns location-off when no region is resolved', () => {
    expect(thisWeekFromPresence(null, 6, new Set())).toEqual({
      state: 'location-off',
      entries: [],
    });
  });

  it('returns quiet when nothing is active this month', () => {
    expect(thisWeekFromPresence([offSeason], 6, new Set())).toEqual({
      state: 'quiet',
      entries: [],
    });
  });

  it('orders new species first, then the most-observed — the ones you can actually find', () => {
    const result = thisWeekFromPresence([rare, common], 6, new Set());
    expect(result.state).toBe('active');
    expect(result.entries.map((e) => e.speciesId)).toEqual(['common', 'rare']);
    expect(result.entries.every((e) => e.isNew)).toBe(true);
  });

  it('sinks already-collected species below new ones regardless of how often they are seen', () => {
    // common is collected, rare is new → rare (new) ranks above common (collected).
    const result = thisWeekFromPresence([common, rare], 6, new Set(['common']));
    expect(result.entries.map((e) => e.speciesId)).toEqual(['rare', 'common']);
    expect(result.entries.map((e) => e.isNew)).toEqual([true, false]);
  });

  it('excludes off-season species from the active list', () => {
    const result = thisWeekFromPresence([common, offSeason, rare], 6, new Set());
    expect(result.entries.map((e) => e.speciesId)).toEqual(['common', 'rare']);
  });

  it('is a stable tie-break when observation counts are equal', () => {
    const a: RegionPresence = { speciesId: 'a', activeMonths: [6], occurrences: 100 };
    const b: RegionPresence = { speciesId: 'b', activeMonths: [6], occurrences: 100 };
    const result = thisWeekFromPresence([a, b], 6, new Set());
    expect(result.entries.map((e) => e.speciesId)).toEqual(['a', 'b']);
  });
});

// T-268 · review B-04: in a month the species is barely recorded, its all-year total must not put
// it at the top. This month's records lead; the all-year total breaks ties.
describe('thisWeekFromPresence orders by this month', () => {
  const swift = {
    speciesId: 'swift',
    activeMonths: [5, 6, 7, 8, 9, 10],
    occurrences: 8000,
    monthCounts: [0, 0, 0, 10, 1500, 3000, 2800, 600, 80, 10, 0, 0],
  };
  const tit = {
    speciesId: 'tit',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    occurrences: 5000,
    monthCounts: [500, 450, 450, 400, 350, 300, 300, 300, 350, 400, 450, 500],
  };

  it('puts the species most recorded this month first', () => {
    const result = thisWeekFromPresence([swift, tit], 10, new Set());
    expect(result.entries.map((e) => e.speciesId)).toEqual(['tit', 'swift']);
  });

  it('falls back to the all-year total when monthly counts are unknown', () => {
    const plain = [
      { speciesId: 'a', activeMonths: [10], occurrences: 10 },
      { speciesId: 'b', activeMonths: [10], occurrences: 90 },
    ];
    expect(thisWeekFromPresence(plain, 10, new Set()).entries.map((e) => e.speciesId)).toEqual([
      'b',
      'a',
    ]);
  });
});
