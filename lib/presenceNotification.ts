import { candidatesForMonth, recordsInMonth } from './presence';
import { DEFAULT_TUNING, type NotificationTuning } from './tuning';
import type { Month } from './species/types';
import type { RegionPresence } from './speciesRepository';

/** Deterministic-testable RNG contract: returns a float in [0, 1). */
export type Rng = () => number;

// Production notification selection over live region presence (T-062, TSD §4 steps 4–5).
// The candidate set (season gate + collection dedupe) comes from T-061; this module adds the
// weighting + sampling. The flavour is derived from the observation count in `species_presence`.
//
// Weight  w = base + scale × log10(1 + occurrences)  — a dampened presence weight (TSD §4), with
// `base`/`scale` from the tuning config (T-065). More-observed species are more likely to surface
// (honest: they genuinely occur more), but log-compression keeps the long tail in play so the feed
// is not "all sparrows": at the defaults, 10 obs → ~2.0, 1_000 → ~4.0, 100_000 → ~6.0. The `base`
// floor lets an active-but-unquantified species (occurrences 0) still be picked. `rarity_flavor` is
// thus observation-frequency, phrased honestly in copy (design inv. #1).

/** Selection weight for a presence row (dampened by observation count). */
export function presenceWeight(
  entry: RegionPresence,
  tuning: NotificationTuning = DEFAULT_TUNING,
  month?: Month,
): number {
  const { base, scale } = tuning.presenceWeight;
  // This month's records where known (T-268): a summer total must not weight an October send.
  return base + scale * Math.log10(1 + Math.max(0, recordsInMonth(entry, month)));
}

/** Sample one presence row from the weighted candidate list; null if empty. */
export function pickWeightedPresence(
  candidates: RegionPresence[],
  rng: Rng,
  tuning: NotificationTuning = DEFAULT_TUNING,
  month?: Month,
): RegionPresence | null {
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, e) => sum + presenceWeight(e, tuning, month), 0);
  if (total <= 0) return null;
  let target = rng() * total;
  for (const entry of candidates) {
    target -= presenceWeight(entry, tuning, month);
    if (target < 0) return entry;
  }
  return candidates[candidates.length - 1]; // float-rounding fallback
}

/**
 * Full pipeline: season-gate → dedupe (T-061) → weighted sample. Null if nothing to send.
 *
 * `presentable` (T-306 · review B-55): a species the notification can show with a name in the
 * reader's language and a photo. While any candidate is presentable only those are drawn from, so
 * the day's one notification is not titled with a Latin binomial and no image; with none, every
 * candidate is.
 */
export function selectFromPresence(
  presence: RegionPresence[],
  month: Month,
  collectedIds: ReadonlySet<string>,
  rng: Rng = Math.random,
  tuning: NotificationTuning = DEFAULT_TUNING,
  presentable?: (speciesId: string) => boolean,
): RegionPresence | null {
  const candidates = candidatesForMonth(presence, month, collectedIds);
  const shown = presentable ? candidates.filter((c) => presentable(c.speciesId)) : [];
  return pickWeightedPresence(shown.length > 0 ? shown : candidates, rng, tuning, month);
}
