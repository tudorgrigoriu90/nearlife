import { SHIFT_SHOWN, arrivingCount, seasonShifts } from './seasonShift';
import type { RegionPresence } from './speciesRepository';

// T-340 · review F-02: who usually arrives next month, and who usually leaves.
function row(id: string, counts: Partial<Record<number, number>>): RegionPresence {
  const monthCounts = Array.from({ length: 12 }, (_, i) => counts[i + 1] ?? 0);
  return { speciesId: id, activeMonths: [], occurrences: monthCounts.reduce((a, b) => a + b, 0), monthCounts };
}

describe('seasonShifts', () => {
  it('arriving: next month at least 3 times this month and at least 20 records', () => {
    const out = seasonShifts([row('swift', { 4: 5, 5: 60 }), row('few', { 4: 0, 5: 19 }), row('steady', { 4: 30, 5: 60 })], 4);
    expect(out.arriving).toEqual(['swift']);
  });

  it('leaving: next month under a quarter of this month, with at least 20 records now', () => {
    const out = seasonShifts([row('crane', { 9: 100, 10: 20 }), row('rare', { 9: 10, 10: 0 }), row('slow', { 9: 100, 10: 30 })], 9);
    expect(out.leaving).toEqual(['crane']);
  });

  it('wraps from December to January', () => {
    expect(seasonShifts([row('waxwing', { 12: 4, 1: 50 })], 12).arriving).toEqual(['waxwing']);
  });

  it('orders by the size of the change, and shows at most five', () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(`s${i}`, { 4: 0, 5: 20 + i * 10 }));
    const out = seasonShifts(rows, 4);
    expect(out.arriving).toHaveLength(SHIFT_SHOWN);
    expect(out.arriving[0]).toBe('s7');
  });

  it('is empty rather than padded, and skips rows without monthly counts', () => {
    const bare: RegionPresence = { speciesId: 'x', activeMonths: [5], occurrences: 100 };
    expect(seasonShifts([bare, row('steady', { 6: 40, 7: 40 })], 6)).toEqual({ arriving: [], leaving: [] });
  });
});

// T-370: a species that lives here all year does not "arrive" because one quiet month is followed
// by a busier one. Wild boar in Kronoberg (GBIF, 2026-11-20): 11 records in November, 32 in
// December, live sightings (tracks in snow, foraging), not hunting reports; but it is there in
// every month. An arrival needs the months before to be nearly empty, and a departure the months
// after.
describe('residents neither arrive nor leave', () => {
  const array = (c: number[]): RegionPresence => ({
    speciesId: '',
    activeMonths: [],
    occurrences: c.reduce((a, b) => a + b, 0),
    monthCounts: c,
  });
  // species_presence, Kronoberg, 2026-11-20.
  const boar = { ...array([39, 43, 36, 49, 100, 81, 51, 30, 18, 24, 10, 32]), speciesId: 'boar' };
  const clubmoss = { ...array([26, 15, 27, 44, 33, 33, 22, 44, 35, 20, 7, 22]), speciesId: 'clubmoss' };
  const swift = { ...array([17, 22, 58, 83, 2780, 2252, 2202, 1338, 121, 24, 16, 20]), speciesId: 'swift' };
  const cuckoo = { ...array([17, 23, 62, 140, 5896, 2877, 400, 226, 107, 23, 16, 20]), speciesId: 'cuckoo' };
  // A resident whose records halve after a busy month: a dip, not a departure.
  const tit = { ...array([300, 280, 400, 500, 450, 300, 220, 40, 120, 150, 200, 260]), speciesId: 'tit' };

  it('wild boar does not "arrive" in December; swifts and cuckoos still arrive in May', () => {
    expect(seasonShifts([boar, clubmoss], 11).arriving).toEqual([]);
    expect(arrivingCount([boar, clubmoss], 11)).toBe(0);
    expect(seasonShifts([swift, cuckoo], 4).arriving).toEqual(['cuckoo', 'swift']);
    expect(arrivingCount([swift, cuckoo], 4)).toBe(2);
  });

  it('a resident with a dip does not "leave"; a migrant that goes does', () => {
    expect(seasonShifts([tit], 7).leaving).toEqual([]);
    expect(seasonShifts([swift], 8).leaving).toEqual(['swift']);
  });
});
