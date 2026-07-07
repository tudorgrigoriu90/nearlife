// Fish minigame scoring — "rhythm & tension" (T-070 core · GDD §4). Reel-style: keep the line in
// the sweet zone. Each tick samples whether the tension was in-zone; you land the catch if you
// held it in-zone for enough of the fight. Render-free core (like timing.ts, T-114) so the RN
// component only draws the bar and feeds samples here.

export interface RhythmConfig {
  /** Fraction of ticks that must be in the sweet zone to land the catch. */
  successRatio: number;
}

/** Forgiving but not trivial: hold the zone ~60% of the fight (GDD §4 "fair success curve"). */
export const DEFAULT_RHYTHM: RhythmConfig = { successRatio: 0.6 };

export interface RhythmResult {
  /** Fraction of ticks spent in the sweet zone (0–1). */
  ratio: number;
  success: boolean;
}

/**
 * Grade a fish fight. `inZoneTicks` of `totalTicks` were inside the sweet zone. An empty fight
 * (no ticks) is not a success — you have to actually hold the line.
 */
export function evaluateRhythm(
  inZoneTicks: number,
  totalTicks: number,
  config: RhythmConfig = DEFAULT_RHYTHM,
): RhythmResult {
  const ratio = totalTicks > 0 ? inZoneTicks / totalTicks : 0;
  return { ratio, success: totalTicks > 0 && ratio >= config.successRatio };
}
