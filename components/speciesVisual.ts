import type { SpeciesGroup } from '../lib/species/group';
import type { TranslationKey } from '../lib/i18n';

// Shared presentation helpers for species (T-025/T-026). Real hero photos come from E14
// (T-119/T-126); until then the prototype shows a per-category emoji, and a neutral silhouette
// for species the user has not spotted yet (USER-FLOWS §2, §4).

export const CATEGORY_EMOJI: Record<SpeciesGroup, string> = {
  bird: '🐦',
  mammal: '🦔',
  amphibian: '🐸',
  reptile: '🦎',
  fish: '🐟',
  insect: '🦋',
  arachnid: '🕷️',
  mollusc: '🐌',
  plant: '🌼',
  fungus: '🍄',
};

/** The i18n label of each group, for chips and badges. */
export const GROUP_LABEL_KEY: Record<SpeciesGroup, TranslationKey> = {
  bird: 'category.bird',
  mammal: 'category.mammal',
  amphibian: 'category.amphibian',
  reptile: 'category.reptile',
  fish: 'category.fish',
  insect: 'category.insect',
  arachnid: 'category.arachnid',
  mollusc: 'category.mollusc',
  plant: 'category.plant',
  fungus: 'category.fungus',
};

/** Silhouette shown for not-yet-spotted species (keeps the grid honest — no reveal). */
export const SILHOUETTE = '❔';

/** Emoji for a species, or the silhouette if it has not been discovered yet. */
export function speciesGlyph(group: SpeciesGroup, discovered: boolean): string {
  return discovered ? CATEGORY_EMOJI[group] : SILHOUETTE;
}
