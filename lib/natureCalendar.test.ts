import { CALENDAR_PER_MONTH, natureCalendar } from './natureCalendar';
import type { Species } from './species/types';

// T-353 · review F-12: the county's nature calendar.
const counts = (peak: number, n: number) => Array.from({ length: 12 }, (_, i) => (i === peak ? n : 0));
const sp = (id: string, monthCounts: number[] | null): Species =>
  ({ id, scientificName: id, commonName: id, category: 'bird', rarity: 'common', activeMonths: [], county: { occurrences: 1, monthCounts } }) as Species;

describe('natureCalendar', () => {
  it('has twelve months, each with the species most recorded that month, at most ten', () => {
    const many = Array.from({ length: 14 }, (_, i) => sp(`m${i}`, counts(4, 100 + i)));
    const cal = natureCalendar([...many, sp('jan', counts(0, 3))]);
    expect(cal).toHaveLength(12);
    expect(cal.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(CALENDAR_PER_MONTH).toBe(10);
    expect(cal[4].species.map((s) => s.id)).toEqual(['m13', 'm12', 'm11', 'm10', 'm9', 'm8', 'm7', 'm6', 'm5', 'm4']);
    expect(cal[0].species.map((s) => s.id)).toEqual(['jan']); // fewer than ten: fewer shown
    expect(cal[1].species).toEqual([]);
  });

  it('ignores species without monthly counts, and breaks ties by id', () => {
    const cal = natureCalendar([sp('b', counts(2, 5)), sp('a', counts(2, 5)), sp('none', null)]);
    expect(cal[2].species.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
