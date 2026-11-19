import type { Month, Species } from './species/types';

// The county's nature calendar (T-353 · review F-12): for each month, the species with the most
// records that month in the county. A ranking of records, so it says what people most often
// recorded then, never that a species is there now (invariant #1). A species counts for a month
// only with at least one record in it, so a quiet month lists fewer.

export const CALENDAR_PER_MONTH = 10;

export function natureCalendar(species: Species[]): { month: Month; species: Species[] }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const ranked = species
      .filter((s) => (s.county?.monthCounts?.[i] ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.county?.monthCounts?.[i] ?? 0) - (a.county?.monthCounts?.[i] ?? 0) || a.id.localeCompare(b.id),
      );
    return { month: (i + 1) as Month, species: ranked.slice(0, CALENDAR_PER_MONTH) };
  });
}
