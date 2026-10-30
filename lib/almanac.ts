import { tierStateFor, type CollectionRecord, type TierState } from './collection';
import { isActiveInMonth } from './season';
import { groupOf, type SpeciesGroup } from './species/group';
import type { Month, Species } from './species/types';

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
): AlmanacEntry[] {
  const filtered = species.filter(
    (s) => (!category || groupOf(s) === category) && (activeIn === undefined || isActiveInMonth(s, activeIn)),
  );
  return filtered.map((s) => {
    const tier = tierStateFor(records, s.id);
    return { species: s, tier, discovered: tier.spotted };
  });
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
export function categoryCounts(
  species: Species[],
  records: CollectionRecord[],
): CategoryCount[] {
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
