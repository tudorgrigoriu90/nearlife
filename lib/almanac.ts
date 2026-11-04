import { tierStateFor, type CollectionRecord, type TierState } from './collection';
import { isActiveInMonth, isActiveInSeason, type Season } from './season';
import type { ContentLocale } from './i18n/contentLocale';
import { commonNameFor } from './species/localized';
import { groupOf, type SpeciesGroup } from './species/group';
import { habitatsFor } from './catchSpots';
import type { Habitat, Month, Species } from './species/types';

// Almanac grid model (T-025). Pure core of the Almanac screen (USER-FLOWS §2): every species
// with its three-tier overlay state (● Spotted / ◐ Caught / ◑ Helped), optionally filtered to a
// single category for the filter chips. Storage-free so it is unit-testable; the screen renders
// what this returns and the Supabase-backed collection (T-056) drops in unchanged. Undiscovered
// species render as a greyed silhouette — `discovered` drives that.

export interface AlmanacEntry {
  species: Species;
  tier: TierState;
  /** True once the species has been spotted; false → greyed silhouette in the grid. */
  discovered: boolean;
}

/** Group display order for the filter chips: vertebrates, then invertebrates, then plants and fungi (T-221). */
export const ALMANAC_CATEGORIES: SpeciesGroup[] = [
  'bird',
  'mammal',
  'amphibian',
  'reptile',
  'fish',
  'insect',
  'arachnid',
  'mollusc',
  'plant',
  'fungus',
];

/**
 * Almanac entries in input (species) order, optionally filtered to one category and/or to the
 * species active in a given month (T-057). Order is stable — the grid stays put as tiers fill in
 * rather than reshuffling under the user.
 */
export function almanacEntries(
  species: Species[],
  records: CollectionRecord[],
  category?: SpeciesGroup,
  activeIn?: Month,
  habitat?: Habitat,
  find: AlmanacFind = {},
): AlmanacEntry[] {
  const query = normalise(find.query ?? '');
  const filtered = species.filter(
    (s) =>
      (!category || groupOf(s) === category) &&
      (activeIn === undefined || isActiveInMonth(s, activeIn)) &&
      (find.season === undefined || isActiveInSeason(s, find.season)) &&
      // The same habitats the catch screen sends people to, defaults included (T-057).
      (habitat === undefined || habitatsFor(s).includes(habitat)),
  );
  return filtered.flatMap((s) => {
    const tier = tierStateFor(records, s.id);
    // Name search covers spotted species only (Director, 2026-11-04): an undiscovered species is
    // never revealed by typing its name, so the "?" cards keep their mystery.
    if (query && !(tier.spotted && matchesName(s, query, find.locale ?? 'en'))) return [];
    return [{ species: s, tier, discovered: tier.spotted }];
  });
}

/** Season and name search for the Almanac (T-240). */
export interface AlmanacFind {
  season?: Season;
  query?: string;
  /** The app language, whose name is searched alongside English, Latin and any carried names. */
  locale?: ContentLocale;
}

/** Lower case, accents removed (å → a, ö → o), so "grahager" finds "Gråhäger". */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Whether `query` is part of the species' local, English, Latin or any carried name. */
export function matchesName(species: Species, query: string, locale: ContentLocale): boolean {
  const q = normalise(query);
  if (!q) return true;
  const names = [
    commonNameFor(species, locale),
    species.commonName,
    species.scientificName,
    ...Object.values(species.names ?? {}),
  ];
  return names.some((n) => typeof n === 'string' && normalise(n).includes(q));
}

export interface CategoryCount {
  category: SpeciesGroup;
  total: number;
  discovered: number;
}

/**
 * Per-category totals + how many are discovered, for the filter chips and progress. Only
 * categories present in `species` are returned, in `ALMANAC_CATEGORIES` order.
 */
export function categoryCounts(species: Species[], records: CollectionRecord[]): CategoryCount[] {
  return ALMANAC_CATEGORIES.map((category) => {
    const inCategory = species.filter((s) => groupOf(s) === category);
    const discovered = inCategory.filter((s) => tierStateFor(records, s.id).spotted).length;
    return { category, total: inCategory.length, discovered };
  }).filter((c) => c.total > 0);
}

/** Total discovered (spotted) across the whole almanac — the grid's progress numerator. */
export function discoveredCount(species: Species[], records: CollectionRecord[]): number {
  return species.filter((s) => tierStateFor(records, s.id).spotted).length;
}
