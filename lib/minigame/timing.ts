// Timing minigame scoring (T-114). Pure core of the bird "tap when it dives" catch minigame
// (GDD §4), used by the prototype minigame (T-033) and the production framework (T-069). The
// RN component renders the shrinking timing ring and reports the tap time relative to the
// perfect moment; this module grades it. Kept render-free so it is unit-testable.

export type TimingGrade = 'perfect' | 'good' | 'miss';

export interface TimingResult {
  grade: TimingGrade;
  /** Whether the catch succeeds (perfect or good). */
  success: boolean;
  /** Absolute distance from the perfect moment, in milliseconds. */
  offsetMs: number;
}

export interface TimingConfig {
  /** |tap − target| within this → "perfect". */
  perfectWindowMs: number;
  /** |tap − target| within this (but beyond perfect) → "good"; beyond → "miss". */
  goodWindowMs: number;
}

/** Tuned for a ~10–20s one-thumb interaction; forgiving enough to feel fair (GDD §4). */
export const DEFAULT_TIMING: TimingConfig = { perfectWindowMs: 120, goodWindowMs: 320 };

/**
 * Grade a tap against the perfect moment. `targetMs` and `tapMs` are on the same clock
 * (e.g. ms since the ring appeared). Early and late taps are treated symmetrically.
 * Window boundaries are inclusive.
 */
export function evaluateTiming(
  targetMs: number,
  tapMs: number,
  config: TimingConfig = DEFAULT_TIMING,
): TimingResult {
  const offsetMs = Math.abs(tapMs - targetMs);
  let grade: TimingGrade;
  if (offsetMs <= config.perfectWindowMs) {
    grade = 'perfect';
  } else if (offsetMs <= config.goodWindowMs) {
    grade = 'good';
  } else {
    grade = 'miss';
  }
  return { grade, success: grade !== 'miss', offsetMs };
}
