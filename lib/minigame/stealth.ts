// Mammal minigame scoring — "stealth" (T-072 core · GDD §4). Advance slowly; freeze when it looks
// up. Each tick records whether the player was moving and whether the animal was alert. Moving
// while alert gets you spotted (instant fail). Progress accrues on ticks where you moved safely;
// you succeed by reaching the required progress without being spotted. Render-free core.

export interface StealthTick {
  moving: boolean;
  alert: boolean;
}

export interface StealthConfig {
  /** Safe-move ticks needed to close the distance. */
  progressNeeded: number;
}

export const DEFAULT_STEALTH: StealthConfig = { progressNeeded: 12 };

export interface StealthResult {
  /** Safe advances made. */
  progress: number;
  /** Moved while the animal was alert → spotted. */
  spotted: boolean;
  success: boolean;
}

/** Grade a stealth approach from the per-tick move/alert history. */
export function evaluateStealth(
  ticks: StealthTick[],
  config: StealthConfig = DEFAULT_STEALTH,
): StealthResult {
  let progress = 0;
  let spotted = false;
  for (const tick of ticks) {
    if (tick.moving && tick.alert) {
      spotted = true;
      break; // caught in the act — the approach ends
    }
    if (tick.moving) progress += 1;
  }
  return { progress, spotted, success: !spotted && progress >= config.progressNeeded };
}
