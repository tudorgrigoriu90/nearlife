import type { Month } from './species/types';

// Seasonal window handling (T-079, GDD §7). Season is a *hard* constraint at catch time, not only
// a surfacing filter: a migrant that is not currently passing through cannot be caught even if the
// user is standing at a habitat spot. This module owns that gate plus the honest "back in N months"
// framing (design invariant #1) so copy never implies a species is around when it isn't.
//
// Windows come from a species' recorded active months (region presence `activeMonths` — the interim
// for T-044's per-cell/month windows; swapping in per-cell data is a data change, not a code change).
// A short window marks a migrant/transient; a near-year-round window is a resident. `monthsUntilOpen`
// lets the UI say "expected back around <month>" honestly instead of "here now".

/** A window this many months or shorter is treated as a migrant/transient passage (not resident). */
export const MIGRANT_MAX_WINDOW_MONTHS = 4;

export type WindowStatus = 'in-window' | 'out-of-window';

export interface SeasonWindow {
  status: WindowStatus;
  /** True when the active window is short enough to be a passage/migrant window. */
  isMigrant: boolean;
  /** Months from `month` until the window next opens; `0` when in-window, `null` when never active. */
  monthsUntilOpen: number | null;
}

/** True only when the species is recorded active in `month` — the hard catch gate. */
export function isInSeason(activeMonths: readonly number[], month: Month): boolean {
  return activeMonths.includes(month);
}

/** Forward distance in months (0–11) from `month` to the nearest active month; null if none. */
function monthsUntilNextActive(activeMonths: readonly number[], month: Month): number | null {
  let best: number | null = null;
  for (const active of activeMonths) {
    const distance = (active - month + 12) % 12;
    if (best === null || distance < best) best = distance;
  }
  return best;
}

/**
 * Classify a species' window at `month`: whether it's catchable now (hard season gate), whether the
 * window is a migrant passage, and how far off the next opening is for honest copy. An empty window
 * (no recorded active months) is permanently out-of-window with `monthsUntilOpen: null`.
 */
export function seasonWindow(activeMonths: readonly number[], month: Month): SeasonWindow {
  const isMigrant =
    activeMonths.length > 0 && activeMonths.length <= MIGRANT_MAX_WINDOW_MONTHS;
  const untilOpen = monthsUntilNextActive(activeMonths, month);
  return {
    status: untilOpen === 0 ? 'in-window' : 'out-of-window',
    isMigrant,
    monthsUntilOpen: untilOpen,
  };
}

/** The catch-time hard constraint: a species may only be caught while genuinely in-window. */
export function catchableThisMonth(activeMonths: readonly number[], month: Month): boolean {
  return isInSeason(activeMonths, month);
}
