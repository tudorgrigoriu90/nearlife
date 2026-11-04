import type { Month, Species } from './species/types';

// Season & active-window helpers (T-110). Pure functions shared by the "Active this week"
// screen (T-111 / T-028), the notification engine (T-112 / T-062), and free-catch accounting
// (T-113 / T-075). Kept clock-free: callers pass a Date to the `*Of(date)` helpers; the core
// predicates take a plain month so they are trivially testable.

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/** 1 = January … 12 = December. */
export function monthOf(date: Date): Month {
  return (date.getMonth() + 1) as Month;
}

/** Meteorological seasons (northern hemisphere): DJF / MAM / JJA / SON. */
export function seasonOf(month: Month): Season {
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/**
 * Stable per-season key used to reset the free-catch allowance (TSD §5b).
 * December is grouped with the following January/February so a winter that spans the
 * year boundary counts as one season, e.g. Dec 2026 and Jan 2027 → "2027-winter".
 */
export function seasonKeyOf(date: Date): string {
  const month = monthOf(date);
  const season = seasonOf(month);
  const seasonYear = month === 12 ? date.getFullYear() + 1 : date.getFullYear();
  return `${seasonYear}-${season}`;
}

/** Whether a species is in its honest "active this season" window for the given month. */
export function isActiveInMonth(species: Species, month: Month): boolean {
  return species.activeMonths.includes(month);
}

/** All species active in the given month (order preserved from the input). */
export function activeSpecies(species: Species[], month: Month): Species[] {
  return species.filter((s) => isActiveInMonth(s, month));
}

/** The months of each meteorological season (Dec–Feb is winter), for the Almanac filter (T-240). */
export const SEASON_MONTHS: Record<Season, Month[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
};

/** Active in any month of the season: the same honest season window, never "here right now". */
export function isActiveInSeason(species: Species, season: Season): boolean {
  return SEASON_MONTHS[season].some((m) => species.activeMonths.includes(m));
}
