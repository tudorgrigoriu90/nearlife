import type { TierState } from './collection';
import { isDepthUnlocked, MAX_DEPTH, unlockedDepth } from './depthTier';

const tier = (spotted: boolean, caught = false, helped = false): TierState => ({
  spotted,
  caught,
  helped,
});

describe('unlockedDepth (climb by play)', () => {
  it('opens tier 1 free even before any play', () => {
    expect(unlockedDepth(tier(false), false)).toBe(1);
  });

  it('climbs with each tier reached', () => {
    expect(unlockedDepth(tier(true), false)).toBe(2); // spotted
    expect(unlockedDepth(tier(true, true), false)).toBe(3); // caught
    expect(unlockedDepth(tier(true, true, true), false)).toBe(MAX_DEPTH); // all three → mastery
  });

  it('helping alone (without catching) still advances past spotted', () => {
    expect(unlockedDepth(tier(true, false, true), false)).toBe(4);
  });

  it('Full Game unlocks everything immediately — same depth a free player can reach', () => {
    expect(unlockedDepth(tier(false), true)).toBe(MAX_DEPTH);
    // progression, not paywall: a fully-engaged free player also reaches MAX_DEPTH.
    expect(unlockedDepth(tier(true, true, true), false)).toBe(unlockedDepth(tier(false), true));
  });
});

describe('isDepthUnlocked', () => {
  it('reflects the unlocked ceiling', () => {
    const t = tier(true); // depth 2
    expect(isDepthUnlocked(1, t, false)).toBe(true);
    expect(isDepthUnlocked(2, t, false)).toBe(true);
    expect(isDepthUnlocked(3, t, false)).toBe(false);
    expect(isDepthUnlocked(5, t, true)).toBe(true);
  });
});
