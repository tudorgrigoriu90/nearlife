import type { Month } from './species/types';
import type { RegionPresence } from './speciesRepository';

// Region-presence selection core (T-061). Given a region's presence rows (`species_presence`:
// species + months-recorded + occurrence count) and the current month, resolve the candidate set
// the notification engine (T-062) and This Week (T-078) consume: species recorded active this
// month — the hard season gate (GBIF phenology, TSD §4) — deduped against what the user already
// spotted. Region is the interim for the H3 user-cell (T-043/T-044); this logic is source-shape
// agnostic, so swapping region presence for per-cell probability later is a data change, not a
// code change. Pure + unit-tested; consumed by the scheduled engine (T-064) unchanged.

/** True when the species was recorded active in `month` in this region. */
export function isActiveThisMonth(entry: RegionPresence, month: Month): boolean {
  return entry.activeMonths.includes(month);
}

/**
 * How often the species is recorded in `month` here: that month's count where monthly counts are
 * known (T-261), else the all-year total. Ranks This Week and weights notifications (T-268), so a
 * species barely recorded this month is not put first by its summer total.
 */
export function recordsInMonth(entry: RegionPresence, month?: Month): number {
  const counts = entry.monthCounts;
  if (month !== undefined && counts && counts.length === 12) return counts[month - 1];
  return entry.occurrences;
}

/** Candidate set: active this month AND not already in the user's collection (dedupe). */
export function candidatesForMonth(
  presence: RegionPresence[],
  month: Month,
  collectedIds: ReadonlySet<string>,
): RegionPresence[] {
  return presence.filter(
    (entry) => isActiveThisMonth(entry, month) && !collectedIds.has(entry.speciesId),
  );
}
