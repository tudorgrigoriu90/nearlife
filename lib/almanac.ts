import { tierStateFor, type CollectionRecord, type TierState } from './collection';
import type { Species, SpeciesCategory } from './species/types';

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

/** Category display order for the filter chips (matches GDD §4 category set). */
export const ALMANAC_CATEGORIES: SpeciesCategory[] = [
  'bird',
  'mammal',
  'insect',
  'plant',
  'fish',
  'fungus',
];

/**
 * Almanac entries in input (species) order, optionally filtered to one category. Order is
 * stable — the grid stays put as tiers fill in rather than reshuffling under the user.
 */
export function almanacEntries(
  species: Species[],
  records: CollectionRecord[],
  category?: SpeciesCategory,
): AlmanacEntry[] {
  const filtered = category ? species.filter((s) => s.category === category) : species;
  return filtered.map((s) => {
    const tier = tierStateFor(records, s.id);
    return { species: s, tier, discovered: tier.spotted };
  });
}

export interface CategoryCount {
  category: SpeciesCategory;
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
    const inCategory = species.filter((s) => s.category === category);
    const discovered = inCategory.filter((s) => tierStateFor(records, s.id).spotted).length;
    return { category, total: inCategory.length, discovered };
  }).filter((c) => c.total > 0);
}

/** Total discovered (spotted) across the whole almanac — the grid's progress numerator. */
export function discoveredCount(species: Species[], records: CollectionRecord[]): number {
  return species.filter((s) => tierStateFor(records, s.id).spotted).length;
}
