import { candidatesForMonth } from './presence';
import type { Rng } from './notification';
import type { Month } from './species/types';
import type { RegionPresence } from './speciesRepository';

// Production notification selection over live region presence (T-062, TSD §4 steps 4–5).
// The candidate set (season gate + collection dedupe) comes from T-061; this module adds the
// weighting + sampling. The hardcoded path (`notification.ts`) weights by a curated rarity enum;
// here the flavour is derived from the observation count in `species_presence`.
//
// Weight  w = 1 + log10(1 + occurrences)  — a dampened presence weight (TSD §4). More-observed
// species are more likely to surface (honest: they genuinely occur more), but log-compression
// keeps the long tail in play so the feed is not "all sparrows": 10 obs → ~2.0, 1_000 → ~4.0,
// 100_000 → ~6.0. The `+1` floor lets an active-but-unquantified species (occurrences 0) still be
// picked. `rarity_flavor` is thus observation-frequency, phrased honestly in copy (design inv. #1).

/** Selection weight for a presence row (dampened by observation count). */
export function presenceWeight(entry: RegionPresence): number {
  return 1 + Math.log10(1 + Math.max(0, entry.occurrences));
}

/** Sample one presence row from the weighted candidate list; null if empty. */
export function pickWeightedPresence(candidates: RegionPresence[], rng: Rng): RegionPresence | null {
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, e) => sum + presenceWeight(e), 0);
  if (total <= 0) return null;
  let target = rng() * total;
  for (const entry of candidates) {
    target -= presenceWeight(entry);
    if (target < 0) return entry;
  }
  return candidates[candidates.length - 1]; // float-rounding fallback
}

/** Full pipeline: season-gate → dedupe (T-061) → weighted sample. Null if nothing to send. */
export function selectFromPresence(
  presence: RegionPresence[],
  month: Month,
  collectedIds: ReadonlySet<string>,
  rng: Rng = Math.random,
): RegionPresence | null {
  return pickWeightedPresence(candidatesForMonth(presence, month, collectedIds), rng);
}
