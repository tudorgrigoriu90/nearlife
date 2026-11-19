import {
  canCatch,
  freeCatchStateFrom,
  FreeCatchState,
  FREE_CATCHES_PER_SEASON,
  remainingFreeCatches,
} from './freeCatch';

const SUMMER = '2026-summer';
const AUTUMN = '2026-autumn';

/** A state with `n` free catches used in `season`. */
const used = (n: number, season: string | null = SUMMER): FreeCatchState => ({
  fullGame: false,
  freeCatchesUsed: n,
  freeCatchSeason: season,
});

describe('free-catch accounting (free user)', () => {
  it('allows exactly FREE_CATCHES_PER_SEASON catches, then blocks', () => {
    for (let n = 0; n < FREE_CATCHES_PER_SEASON; n++) expect(canCatch(used(n), SUMMER)).toBe(true);
    expect(canCatch(used(FREE_CATCHES_PER_SEASON), SUMMER)).toBe(false);
    expect(remainingFreeCatches(used(FREE_CATCHES_PER_SEASON), SUMMER)).toBe(0);
  });

  it('starts with the full allowance before the first catch', () => {
    expect(remainingFreeCatches(used(0, null), SUMMER)).toBe(FREE_CATCHES_PER_SEASON);
  });

  it('resets the allowance when the season rolls over', () => {
    const spent = used(FREE_CATCHES_PER_SEASON);
    expect(canCatch(spent, SUMMER)).toBe(false);
    expect(canCatch(spent, AUTUMN)).toBe(true);
    expect(remainingFreeCatches(spent, AUTUMN)).toBe(FREE_CATCHES_PER_SEASON);
  });

  it('decrements remaining as catches are used', () => {
    expect(remainingFreeCatches(used(0), SUMMER)).toBe(3);
    expect(remainingFreeCatches(used(1), SUMMER)).toBe(2);
  });
});

describe('free-catch accounting (Full Game)', () => {
  it('grants unlimited catches whatever the count', () => {
    const paid: FreeCatchState = { fullGame: true, freeCatchesUsed: 10, freeCatchSeason: SUMMER };
    expect(canCatch(paid, SUMMER)).toBe(true);
    expect(remainingFreeCatches(paid, SUMMER)).toBe(Infinity);
  });
});

// T-200: the count is derived from the collection, so it survives a restart and cannot drift.
describe('freeCatchStateFrom', () => {
  const season = (iso: string) => (iso.startsWith('2026-1') ? '2026-autumn' : '2026-summer');

  it('counts only this season\'s catches', () => {
    const records = [
      { caughtAt: '2026-10-01T10:00:00Z' },
      { caughtAt: '2026-11-02T10:00:00Z' },
      { caughtAt: '2026-07-01T10:00:00Z' }, // last season
      { caughtAt: null }, // spotted only
    ];
    expect(freeCatchStateFrom(records, '2026-autumn', false, season)).toEqual({
      fullGame: false,
      freeCatchesUsed: 2,
      freeCatchSeason: '2026-autumn',
    });
  });

  it('blocks the 4th catch of a season and frees the allowance when the season rolls over', () => {
    const three = Array.from({ length: 3 }, () => ({ caughtAt: '2026-10-01T10:00:00Z' }));
    expect(canCatch(freeCatchStateFrom(three, '2026-autumn', false, season), '2026-autumn')).toBe(false);
    expect(canCatch(freeCatchStateFrom(three, '2026-winter', false, season), '2026-winter')).toBe(true);
  });

  it('never limits a Full Game owner', () => {
    const many = Array.from({ length: 9 }, () => ({ caughtAt: '2026-10-01T10:00:00Z' }));
    expect(canCatch(freeCatchStateFrom(many, '2026-autumn', true, season), '2026-autumn')).toBe(true);
  });

  it('reads the season from the real season helper by default', () => {
    expect(freeCatchStateFrom([{ caughtAt: '2026-10-15T12:00:00Z' }], '2026-autumn').freeCatchesUsed).toBe(1);
  });
});
