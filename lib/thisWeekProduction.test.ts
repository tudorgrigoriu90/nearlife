import { thisWeekFromPresence } from './thisWeekProduction';
import type { RegionPresence } from './speciesRepository';

const common: RegionPresence = { speciesId: 'common', activeMonths: [6], occurrences: 5000 };
const rare: RegionPresence = { speciesId: 'rare', activeMonths: [6], occurrences: 20 };
const offSeason: RegionPresence = { speciesId: 'off', activeMonths: [1], occurrences: 100 };

describe('thisWeekFromPresence', () => {
  it('returns location-off when no region is resolved', () => {
    expect(thisWeekFromPresence(null, 6, new Set())).toEqual({ state: 'location-off', entries: [] });
  });

  it('returns quiet when nothing is active this month', () => {
    expect(thisWeekFromPresence([offSeason], 6, new Set())).toEqual({ state: 'quiet', entries: [] });
  });

  it('orders new species first, then rarer (fewer occurrences) first', () => {
    const result = thisWeekFromPresence([common, rare], 6, new Set());
    expect(result.state).toBe('active');
    expect(result.entries.map((e) => e.speciesId)).toEqual(['rare', 'common']);
    expect(result.entries.every((e) => e.isNew)).toBe(true);
  });

  it('sinks already-collected species below new ones regardless of rarity', () => {
    // rare is collected, common is new → common (new) ranks above rare (collected).
    const result = thisWeekFromPresence([common, rare], 6, new Set(['rare']));
    expect(result.entries.map((e) => e.speciesId)).toEqual(['common', 'rare']);
    expect(result.entries.map((e) => e.isNew)).toEqual([true, false]);
  });

  it('excludes off-season species from the active list', () => {
    const result = thisWeekFromPresence([common, offSeason, rare], 6, new Set());
    expect(result.entries.map((e) => e.speciesId)).toEqual(['rare', 'common']);
  });

  it('is a stable tie-break when rarity flavour is equal', () => {
    const a: RegionPresence = { speciesId: 'a', activeMonths: [6], occurrences: 100 };
    const b: RegionPresence = { speciesId: 'b', activeMonths: [6], occurrences: 100 };
    const result = thisWeekFromPresence([a, b], 6, new Set());
    expect(result.entries.map((e) => e.speciesId)).toEqual(['a', 'b']);
  });
});
