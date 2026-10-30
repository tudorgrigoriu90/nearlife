import type { Species, SpeciesCategory } from './types';

// How a species is shown and filed (T-221): its glyph, its almanac chip, its completion badge.
// `category` is the catch minigame, and spiders, snails, frogs and lizards borrow one (T-207), so
// grouping by it filed a snail under Plants. They keep the borrowed minigame; this is what they
// are.

export type SpeciesGroup = SpeciesCategory | 'amphibian' | 'reptile' | 'arachnid' | 'mollusc';

/** Taxon groups (the catalogue's `taxon_group`) that have no category of their own. */
export const GROUP_BY_TAXON: Partial<Record<string, SpeciesGroup>> = {
  amphibian: 'amphibian',
  reptile: 'reptile',
  arachnid: 'arachnid',
  mollusc: 'mollusc',
};

export function groupOf(species: Pick<Species, 'category' | 'group'>): SpeciesGroup {
  return species.group ?? species.category;
}
