import type { Rarity } from './species/types';

// Notification-engine tuning levers (T-065, TSD §4). The "fake-it" prototype has to tune the
// *feel* of the feed without redeploys, so the surfacing curves and cadence live here as config
// rather than inline constants. Both selection paths read these: the bundled/curated path
// (`notification.ts`, rarity-band flavour) and the production path (`presenceNotification.ts`,
// observation-count flavour). Overriding is a config change, not a code change (design goal:
// tunable, honest, fully documented — rarity flavour is surfacing order, not a claim of rarity).

export interface NotificationTuning {
  /** Surfacing boost by curated rarity band — the bundled path's `rarity_flavor` curve. */
  rarityFlavor: Record<Rarity, number>;
  /**
   * Production path's `rarity_flavor` from observation count, as a dampened presence weight:
   * `base + scale × log10(1 + occurrences)`. Log-compression keeps the long tail in play; `base`
   * is the floor so an active-but-unquantified species (0 occurrences) can still be picked.
   */
  presenceWeight: { base: number; scale: number };
  /** Cadence cap: maximum notifications per user per day. */
  cadencePerDay: number;
}

export const DEFAULT_TUNING: NotificationTuning = {
  rarityFlavor: { common: 1, uncommon: 2, rare: 4 },
  presenceWeight: { base: 1, scale: 1 },
  cadencePerDay: 1,
};
