// Plant/fungus minigame scoring — "spot & frame" (T-073 core · GDD §4). Find it in the scene and
// frame it well — no photo required. The player places a framing reticle; accuracy falls off with
// distance from the subject's centre, normalised by a generous target radius. Land it if accuracy
// clears the threshold. Render-free core (spatial analogue of the timing grade, T-114).

export interface FrameConfig {
  /** Normalised accuracy (0–1) needed to land it. */
  successThreshold: number;
}

export const DEFAULT_FRAME: FrameConfig = { successThreshold: 0.5 };

export interface FrameResult {
  /** 1 at dead-centre, 0 at/beyond the target radius. */
  accuracy: number;
  success: boolean;
}

/**
 * Grade a framing. `distanceFromCenter` is how far the reticle centre landed from the subject,
 * `targetRadius` the forgiving radius that counts as "on it". Accuracy is linear to the edge.
 */
export function evaluateFrame(
  distanceFromCenter: number,
  targetRadius: number,
  config: FrameConfig = DEFAULT_FRAME,
): FrameResult {
  const clamped = Math.max(0, Math.min(distanceFromCenter, targetRadius));
  const accuracy = targetRadius > 0 ? 1 - clamped / targetRadius : 0;
  return { accuracy, success: accuracy >= config.successThreshold };
}
