// Domain types for the species catalogue. Kept UI-agnostic so it can be unit-tested and
// reused by the app, the notification engine, and (later) the data pipeline.
// Card content (fact / trivia / give / protect) is a separate concern — see T-020.

/**
 * Species categories. Bird/insect/plant/mammal are the prototype focus (T-019); fish and
 * fungus round out the set that the per-category catch minigames target (GDD §4).
 */
export type SpeciesCategory = 'bird' | 'mammal' | 'insect' | 'plant' | 'fish' | 'fungus';

/** Observation-frequency flavour used to weight notifications (TSD §4), not true rarity. */
export type Rarity = 'common' | 'uncommon' | 'rare';

/** Month of the year, 1 = January … 12 = December. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Species {
  /** Stable kebab-case identifier (also the notification/collection key). */
  id: string;
  /** Binomial scientific name, e.g. "Apus apus". */
  scientificName: string;
  /** English common name shown on the card. */
  commonName: string;
  category: SpeciesCategory;
  rarity: Rarity;
  /**
   * Months in which the species is plausibly active/notable in the region — the honest
   * "active this season" window (GDD §6, never "here right now"). Hardcoded for the
   * Kronoberg prototype; derived from GBIF per-cell/per-month probability later (TSD §4).
   */
  activeMonths: Month[];
}
