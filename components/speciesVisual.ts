import type { SpeciesCategory } from '../lib/species/types';

// Shared presentation helpers for species (T-025/T-026). Real hero photos come from E14
// (T-119/T-126); until then the prototype shows a per-category emoji, and a neutral silhouette
// for species the user has not spotted yet (USER-FLOWS §2, §4).

export const CATEGORY_EMOJI: Record<SpeciesCategory, string> = {
  bird: '🐦',
  mammal: '🦔',
  insect: '🦋',
  plant: '🌼',
  fish: '🐟',
  fungus: '🍄',
};

/** Silhouette shown for not-yet-spotted species (keeps the grid honest — no reveal). */
export const SILHOUETTE = '❔';

/** Emoji for a species, or the silhouette if it has not been discovered yet. */
export function speciesGlyph(category: SpeciesCategory, discovered: boolean): string {
  return discovered ? CATEGORY_EMOJI[category] : SILHOUETTE;
}
