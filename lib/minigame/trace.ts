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

export const DEFAULT_TRACE: TraceConfig = { tolerancePx: 28, allowedBreaks: 6 };

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
