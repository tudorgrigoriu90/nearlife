import { candidatesForMonth, isActiveThisMonth } from './presence';
import type { RegionPresence } from './speciesRepository';

const pike: RegionPresence = { speciesId: 'pike', activeMonths: [5, 6, 7], occurrences: 42 };
const perch: RegionPresence = { speciesId: 'perch', activeMonths: [6], occurrences: 10 };
const owl: RegionPresence = { speciesId: 'owl', activeMonths: [1, 12], occurrences: 3 };

describe('isActiveThisMonth', () => {
  it('is true only for a month the species was recorded active', () => {
    expect(isActiveThisMonth(pike, 6)).toBe(true);
    expect(isActiveThisMonth(pike, 8)).toBe(false);
  });
});

describe('candidatesForMonth', () => {
  it('keeps only species active this month', () => {
    const out = candidatesForMonth([pike, perch, owl], 6, new Set());
    expect(out.map((e) => e.speciesId)).toEqual(['pike', 'perch']);
  });

  it('drops species the user already collected', () => {
    const out = candidatesForMonth([pike, perch, owl], 6, new Set(['pike']));
    expect(out.map((e) => e.speciesId)).toEqual(['perch']);
  });

  it('is empty when nothing is active this month', () => {
    expect(candidatesForMonth([pike, perch, owl], 3, new Set())).toEqual([]);
  });

  it('applies the season gate and the dedupe together', () => {
    const out = candidatesForMonth([pike, perch, owl], 6, new Set(['perch']));
    expect(out.map((e) => e.speciesId)).toEqual(['pike']);
  });
});
