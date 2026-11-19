import type { Month } from './species/types';
import type { RegionPresence } from './speciesRepository';

// Arriving soon / leaving soon (T-340 · review F-02): a weekly reason to open the app when "active
// this season" barely changes. Drawn from the county's records per month (T-261), so the copy can
// only ever say "usually" (invariant #1): this is what past years' records show, not who is here.

export const SHIFT_RATIO_UP = 3;
export const SHIFT_RATIO_DOWN = 0.25;
/** Below this many records a ratio is noise: one record to three is not an arrival. */
export const SHIFT_MIN_RECORDS = 20;
export const SHIFT_SHOWN = 5;

export interface SeasonShifts {
  arriving: string[];
  leaving: string[];
}

/** Species ids that usually arrive next month, and that usually leave, biggest change first. */
export function seasonShifts(presence: RegionPresence[], month: Month): SeasonShifts {
  const next = (month % 12) + 1;
  const arriving: [string, number][] = [];
  const leaving: [string, number][] = [];
  for (const p of presence) {
    const counts = p.monthCounts;
    if (!counts || counts.length !== 12) continue;
    const now = counts[month - 1];
    const then = counts[next - 1];
    if (then >= SHIFT_MIN_RECORDS && then >= SHIFT_RATIO_UP * now) arriving.push([p.speciesId, then - now]);
    else if (now >= SHIFT_MIN_RECORDS && then < SHIFT_RATIO_DOWN * now) leaving.push([p.speciesId, now - then]);
  }
  const top = (list: [string, number][]) =>
    list
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, SHIFT_SHOWN)
      .map(([id]) => id);
  return { arriving: top(arriving), leaving: top(leaving) };
}
