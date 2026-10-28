import {
  canCatch,
  freeCatchStateFrom,
  FreeCatchState,
  FREE_CATCHES_PER_SEASON,
  registerCatch,
  remainingFreeCatches,
} from './freeCatch';

const SUMMER = '2026-summer';
const AUTUMN = '2026-autumn';

const freshFree: FreeCatchState = { fullGame: false, freeCatchesUsed: 0, freeCatchSeason: null };

describe('free-catch accounting (free user)', () => {
  it('allows exactly FREE_CATCHES_PER_SEASON catches, then blocks', () => {
    let state = freshFree;
    for (let i = 0; i < FREE_CATCHES_PER_SEASON; i++) {
      expect(canCatch(state, SUMMER)).toBe(true);
      state = registerCatch(state, SUMMER);
    }
    expect(canCatch(state, SUMMER)).toBe(false);
    expect(remainingFreeCatches(state, SUMMER)).toBe(0);
  });

  it('throws if a catch is registered past the limit', () => {
    let state = freshFree;
    for (let i = 0; i < FREE_CATCHES_PER_SEASON; i++) state = registerCatch(state, SUMMER);
    expect(() => registerCatch(state, SUMMER)).toThrow(/limit/);
  });

  it('resets the allowance when the season rolls over', () => {
    let state = freshFree;
    for (let i = 0; i < FREE_CATCHES_PER_SEASON; i++) state = registerCatch(state, SUMMER);
    expect(canCatch(state, SUMMER)).toBe(false);
    // New season → full allowance again.
    expect(canCatch(state, AUTUMN)).toBe(true);
    expect(remainingFreeCatches(state, AUTUMN)).toBe(FREE_CATCHES_PER_SEASON);
  });

  it('decrements remaining as catches are used', () => {
    let state = freshFree;
    expect(remainingFreeCatches(state, SUMMER)).toBe(3);
    state = registerCatch(state, SUMMER);
    expect(remainingFreeCatches(state, SUMMER)).toBe(2);
  });
});

describe('free-catch accounting (Full Game)', () => {
  const paid: FreeCatchState = { fullGame: true, freeCatchesUsed: 0, freeCatchSeason: null };

  it('grants unlimited catches', () => {
    let state = paid;
    for (let i = 0; i < 10; i++) {
      expect(canCatch(state, SUMMER)).toBe(true);
      state = registerCatch(state, SUMMER);
    }
    expect(remainingFreeCatches(state, SUMMER)).toBe(Infinity);
  });

  it('does not increment the free-catch counter', () => {
    const state = registerCatch(paid, SUMMER);
    expect(state.freeCatchesUsed).toBe(0);
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
