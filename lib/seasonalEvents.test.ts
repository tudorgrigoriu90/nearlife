import { SEASONAL_EVENTS, eventMonths, seasonalEvents } from './seasonalEvents';
import type { Species } from './species/types';

// T-357 · review F-17: events derived per county from the monthly records.
const sp = (scientificName: string, monthCounts: number[] | null, category: Species['category'] = 'bird'): Species =>
  ({
    id: scientificName,
    scientificName,
    commonName: scientificName,
    category,
    rarity: 'common',
    activeMonths: [],
    county: { occurrences: monthCounts ? monthCounts.reduce((a, b) => a + b, 0) : 0, monthCounts },
  }) as Species;

// Kronoberg's records (species_presence, 2026-11-19).
const SWIFT = [17, 22, 58, 83, 2780, 2252, 2202, 1338, 121, 24, 16, 20];
const CUCKOO = [17, 23, 62, 140, 5896, 2877, 400, 226, 107, 23, 16, 20];
const CRANE = [54, 990, 10216, 8719, 6270, 3115, 2625, 3185, 3205, 1372, 189, 74];
const SALMON = [0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 1, 0];
const KRONOBERG = [sp('Apus apus', SWIFT), sp('Cuculus canorus', CUCKOO), sp('Grus grus', CRANE), sp('Salmo salar', SALMON, 'fish')];

const def = (id: string) => SEASONAL_EVENTS.find((e) => e.id === id)!;

describe('seasonal events from the county records', () => {
  it('finds an arrival in the month the records jump', () => {
    expect(eventMonths(def('swift-arrival'), KRONOBERG)).toEqual([5]);
    expect(eventMonths(def('cuckoo-arrival'), KRONOBERG)).toEqual([5]);
  });

  it('finds a gathering in the months near the peak', () => {
    expect(eventMonths(def('crane-gathering'), KRONOBERG)).toEqual([3, 4]);
  });

  it('shows nothing where the records are too few to show it', () => {
    expect(eventMonths(def('salmon-run'), KRONOBERG)).toEqual([]);
    expect(eventMonths(def('swift-arrival'), [sp('Apus apus', null)])).toEqual([]);
    expect(eventMonths(def('swift-arrival'), [])).toEqual([]);
  });

  it('a flat year has no arrival', () => {
    expect(eventMonths(def('swift-arrival'), [sp('Apus apus', Array(12).fill(100))])).toEqual([]);
  });

  it('sums a group for a group event, within its window', () => {
    const fungi = [
      sp('Amanita muscaria', [0, 0, 0, 0, 0, 5, 20, 200, 400, 300, 40, 0], 'fungus'),
      sp('Boletus edulis', [0, 0, 0, 0, 0, 0, 10, 350, 350, 100, 0, 0], 'fungus'),
    ];
    expect(eventMonths(def('mushroom-season'), fungi)).toEqual([8, 9]);
  });

  it('lists the events under way this month', () => {
    expect(seasonalEvents(KRONOBERG, 5)).toEqual(['swift-arrival', 'cuckoo-arrival']);
    expect(seasonalEvents(KRONOBERG, 3)).toEqual(['crane-gathering']);
    expect(seasonalEvents(KRONOBERG, 7)).toEqual([]);
  });
});
