import {
  catchableThisMonth,
  isInSeason,
  MIGRANT_MAX_WINDOW_MONTHS,
  seasonWindow,
} from './seasonalWindow';

const swift = [5, 6, 7]; // migrant: short spring/summer passage
const resident = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const winterVisitor = [11, 12, 1, 2]; // wraps the year boundary

describe('isInSeason / catchableThisMonth', () => {
  it('is the hard gate: true only inside the recorded window', () => {
    expect(isInSeason(swift, 6)).toBe(true);
    expect(isInSeason(swift, 9)).toBe(false);
    expect(catchableThisMonth(swift, 6)).toBe(true);
    expect(catchableThisMonth(swift, 9)).toBe(false);
  });
});

describe('seasonWindow', () => {
  it('reports in-window with zero months-until-open when active now', () => {
    expect(seasonWindow(swift, 6)).toEqual({ status: 'in-window', isMigrant: true, monthsUntilOpen: 0 });
  });

  it('measures forward distance to the next opening when out of window', () => {
    // In September, the swift window (May) next opens 8 months out.
    expect(seasonWindow(swift, 9)).toEqual({ status: 'out-of-window', isMigrant: true, monthsUntilOpen: 8 });
  });

  it('wraps across the year boundary for the nearest opening', () => {
    // In October, the Nov–Feb visitor opens next month.
    expect(seasonWindow(winterVisitor, 10)).toEqual({
      status: 'out-of-window',
      isMigrant: true,
      monthsUntilOpen: 1,
    });
  });

  it('classifies a near-year-round species as a resident, always in-window', () => {
    const w = seasonWindow(resident, 3);
    expect(w.isMigrant).toBe(false);
    expect(w.status).toBe('in-window');
  });

  it('treats a species with no recorded months as permanently out of window', () => {
    expect(seasonWindow([], 6)).toEqual({ status: 'out-of-window', isMigrant: false, monthsUntilOpen: null });
  });

  it('uses the documented migrant threshold', () => {
    const exactlyThreshold = [1, 2, 3, 4];
    expect(exactlyThreshold.length).toBe(MIGRANT_MAX_WINDOW_MONTHS);
    expect(seasonWindow(exactlyThreshold, 6).isMigrant).toBe(true);
    expect(seasonWindow([1, 2, 3, 4, 5], 6).isMigrant).toBe(false);
  });
});
