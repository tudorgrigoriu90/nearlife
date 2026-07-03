import {
  canCatch,
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
