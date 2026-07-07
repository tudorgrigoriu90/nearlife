import type { TierState } from './collection';

// Depth-tier climb-by-play (T-060 core · GDD §8, ECONOMY). Every species has 5 depth levels of
// content. Tier 1 (the always-free Tier-1 fact) is open to everyone; free users climb the rest by
// *playing* — spotting, catching, then helping — and completing all three opens the last level.
// Full Game unlocks all five immediately. This is progression, not a paywall: a free player who
// engages reaches the same depth. Pure so the card (T-059) and unlock logic (T-060) share it.

export const MAX_DEPTH = 5;

/** Highest depth level unlocked for a species given its tier state and entitlement (1..5). */
export function unlockedDepth(tier: TierState, fullGame: boolean): number {
  if (fullGame) return MAX_DEPTH;
  let depth = 1; // Tier-1 fact is always free (invariant #2).
  if (tier.spotted) depth = 2;
  if (tier.caught) depth = 3;
  if (tier.helped) depth = 4;
  if (tier.spotted && tier.caught && tier.helped) depth = MAX_DEPTH; // mastery
  return depth;
}

/** Whether a specific depth `level` (1-based) is unlocked. */
export function isDepthUnlocked(level: number, tier: TierState, fullGame: boolean): boolean {
  return level <= unlockedDepth(tier, fullGame);
}
