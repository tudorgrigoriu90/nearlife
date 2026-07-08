// Shared score → grade copy mapping for every catch minigame (T-069 · GDD §4). Each category's
// render-free core reports a 0–1 score and a success flag; this maps that to the three grade
// bands the result screen shows. Render-free so it is unit-testable independent of any component.

export type MinigameGrade = 'perfect' | 'good' | 'miss';

/** Threshold above which a successful catch reads as "Perfect!" rather than "Nice one!". */
export const PERFECT_THRESHOLD = 0.85;

/**
 * A failed catch is always a "miss" regardless of score; a success is "perfect" at/above the
 * threshold, otherwise "good".
 */
export function gradeFromScore(success: boolean, score: number): MinigameGrade {
  if (!success) return 'miss';
  return score >= PERFECT_THRESHOLD ? 'perfect' : 'good';
}
