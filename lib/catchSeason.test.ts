import { catchSeason } from './catchSeason';

// T-268 · review B-26: the catch gate the card and attemptCatch share.
describe('catchSeason', () => {
  it('is open in an active month', () => {
    expect(catchSeason([5, 6, 7, 8], 6)).toEqual({ open: true });
  });

  it('is closed out of season and names the month it opens again', () => {
    expect(catchSeason([5, 6, 7, 8], 11)).toEqual({ open: false, backAround: 5 });
    expect(catchSeason([11, 12, 1, 2], 4)).toEqual({ open: false, backAround: 11 });
  });

  it('does not gate a species whose season is unknown (no active month)', () => {
    expect(catchSeason([], 1)).toEqual({ open: true });
  });
});
