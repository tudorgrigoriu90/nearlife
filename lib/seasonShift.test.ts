import { SHIFT_SHOWN, seasonShifts } from './seasonShift';
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
