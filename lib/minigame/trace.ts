// Insect minigame scoring — "trace" (T-071 core · GDD §4). Follow the flight path without
// breaking the line: each tick samples the finger's distance from the path; a "break" is a tick
// where it strayed past tolerance. You succeed if you broke the line no more than the allowed
// number of times. Render-free core so the component only samples touch positions.

export interface TraceConfig {
  /** Distance (px) from the path beyond which a sample counts as a break. */
  tolerancePx: number;
  /** How many break ticks are forgiven before the trace fails. */
  allowedBreaks: number;
}

// T-277 · review B-60: 28 px / 6 breaks left 0.36 s of slack in a 10 s game; no first-time player
// won. 44 px is a fingertip; 25 breaks are 15% of the ~166 samples. Starting values, to be
// confirmed by the Director's phone test (T-277).
export const DEFAULT_TRACE: TraceConfig = { tolerancePx: 44, allowedBreaks: 25 };

export interface TraceResult {
  breaks: number;
  success: boolean;
}

/** Grade a trace from per-tick distances between the finger and the target path. */
export function evaluateTrace(
  distances: number[],
  config: TraceConfig = DEFAULT_TRACE,
): TraceResult {
  const breaks = distances.filter((d) => d > config.tolerancePx).length;
  return { breaks, success: distances.length > 0 && breaks <= config.allowedBreaks };
}
