import type { Locale } from '../../lib/i18n';

// Shared minigame contract (T-069 · GDD §4). Every per-category catch minigame is a one-thumb,
// ~10–20s interaction that reports the same outcome shape, so the catch flow (App.tsx / T-034,
// T-075) can drive any of them identically. Scoring lives in render-free cores under
// lib/minigame/*; each component only owns the visual and feeds samples to its core.

/** The result the catch flow cares about, common to every category. */
export interface MinigameOutcome {
  success: boolean;
  /** How well the player did, 0–1, for feedback flavour (grade copy, future streaks). */
  score: number;
}

/** Props every category minigame accepts. Kept minimal and identical across categories. */
export interface MinigameProps {
  locale?: Locale;
  onComplete: (outcome: MinigameOutcome) => void;
  onCancel?: () => void;
  /** After a miss: play the same game again, here and now (T-311 · review B-45). */
  onRetry?: () => void;
  /** The species' glyph, shown as the creature in the game (T-321 · review B-61). */
  glyph?: string;
  /** Varies the layout per species and day (T-321); a fixed default without one. */
  seed?: number;
}
