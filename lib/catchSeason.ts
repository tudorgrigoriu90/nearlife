import { catchableThisMonth, seasonWindow } from './seasonalWindow';
import type { Month } from './species/types';

// The season gate at catch time (T-079, wired in T-268 · review B-26). GDD §6: "Season = a real
// constraint — a migrant genuinely isn't here in winter; offering to catch it then would break the
// illusion." The months are the species' active months in the county (T-268's threshold), so a
// stray winter record no longer opens a season.
//
// A species with no active month at all has too few records to say when it is around; it is not
// gated, because a closed gate with no month to name would lock it forever.

export type CatchSeason = { open: true } | { open: false; backAround: Month };

export function catchSeason(activeMonths: readonly number[], month: Month): CatchSeason {
  if (activeMonths.length === 0 || catchableThisMonth(activeMonths, month)) return { open: true };
  const until = seasonWindow(activeMonths, month).monthsUntilOpen ?? 0;
  return { open: false, backAround: (((((month - 1 + until) % 12) + 12) % 12) + 1) as Month };
}
