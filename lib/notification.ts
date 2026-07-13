import { activeSpecies } from './season';
import { DEFAULT_TUNING, type NotificationTuning } from './tuning';
import type { Month, Species } from './species/types';

// Notification selection (T-112). Pure core of the notification engine (TSD §4), used by the
// prototype Edge Function (T-030) and the production engine (T-062). Steps 2–5 of TSD §4:
//   2. candidate set = species active this month (hard season gate)
//   3. drop species already in the user's collection (dedupe)
//   4. weight  w = presence_prob × rarity_flavor
//   5. sample one from the weighted distribution
// Cadence, quiet hours, and delivery are integration concerns handled by the caller.
//
// Prototype note: presence_prob is binary (active = 1) until GBIF per-cell/per-month
// probabilities land (T-044). rarity_flavor gives rarer-but-plausible species a boost so the
// feed is not "all sparrows" (TSD §4) — it reflects surfacing flavour, not true rarity.

/** Deterministic-testable RNG contract: returns a float in [0, 1). */
export type Rng = () => number;

/** Active this month AND not already collected. */
export function candidateSpecies(
  species: Species[],
  month: Month,
  collectedIds: ReadonlySet<string>,
): Species[] {
  return activeSpecies(species, month).filter((s) => !collectedIds.has(s.id));
}

/** Selection weight for a species (presence_prob × rarity_flavor; presence is binary here). */
export function weightFor(species: Species, tuning: NotificationTuning = DEFAULT_TUNING): number {
  return tuning.rarityFlavor[species.rarity];
}

/** Sample one species from a weighted list; returns null if empty. */
export function pickWeighted(
  candidates: Species[],
  rng: Rng,
  tuning: NotificationTuning = DEFAULT_TUNING,
): Species | null {
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, s) => sum + weightFor(s, tuning), 0);
  if (total <= 0) return null;
  let target = rng() * total;
  for (const s of candidates) {
    target -= weightFor(s, tuning);
    if (target < 0) return s;
  }
  return candidates[candidates.length - 1]; // float-rounding fallback
}

/** Full pipeline: season-gate → dedupe → weighted sample. Null if nothing to send. */
export function selectNotificationSpecies(
  species: Species[],
  month: Month,
  collectedIds: ReadonlySet<string>,
  rng: Rng = Math.random,
  tuning: NotificationTuning = DEFAULT_TUNING,
): Species | null {
  return pickWeighted(candidateSpecies(species, month, collectedIds), rng, tuning);
}
