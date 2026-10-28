import { isActiveThisMonth } from './presence';
import type { Month } from './species/types';
import type { RegionPresence } from './speciesRepository';

// "Active this week" — production (T-078). The notification-independent pull surface (USER-FLOWS
// §3, TSD §4b): a real read of the user's region presence (`species_presence`), ordered for
// interest, that works with notifications off. The bundled-data core is T-111 (`thisWeek.ts`);
// this operates on live `RegionPresence` rows and models the two empty states the screen must
// handle — location off and a quiet week — as first-class result variants so the UI never has to
// infer them from an empty array.
//
// Ordering: not-yet-collected first (flagged NEW), then MOST-observed first. T-078 originally put
// rarer first to avoid "all sparrows", which suited a curated 54. Wired to a real county (T-207)
// it meant the top of a ~2,000-species list was species recorded once or twice — mostly without a
// common name, and the least likely things a person could go and find. Observation count is the
// honest proxy for findability, so it leads; the notification engine's weighted sampling is
// where the long tail gets its turn.

export interface ThisWeekEntry {
  speciesId: string;
  occurrences: number;
  /** True if the user has not spotted this species yet — surfaced first and flagged NEW. */
  isNew: boolean;
}

/**
 * `location-off` — no region resolved (permission denied / not set); the screen shows the
 * enable-location prompt. `quiet` — region known but nothing is active this month; the screen
 * shows the honest quiet-week message. `active` — `entries` is non-empty and ordered.
 */
export type ThisWeekState = 'location-off' | 'quiet' | 'active';

export interface ThisWeekResult {
  state: ThisWeekState;
  entries: ThisWeekEntry[];
}

export function thisWeekFromPresence(
  presence: RegionPresence[] | null,
  month: Month,
  collectedIds: ReadonlySet<string>,
): ThisWeekResult {
  if (presence === null) return { state: 'location-off', entries: [] };

  const active = presence
    .filter((entry) => isActiveThisMonth(entry, month))
    .map((entry, index) => ({
      speciesId: entry.speciesId,
      occurrences: entry.occurrences,
      isNew: !collectedIds.has(entry.speciesId),
      index,
    }));

  if (active.length === 0) return { state: 'quiet', entries: [] };

  active.sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1; // new first
    if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences; // most-observed first
    return a.index - b.index; // stable tie-break
  });

  return {
    state: 'active',
    entries: active.map(({ speciesId, occurrences, isNew }) => ({ speciesId, occurrences, isNew })),
  };
}
