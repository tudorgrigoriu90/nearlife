import type { CollectionRecord } from './collection';
import type { SpeciesGroup } from './species/group';
import { KRONOBERG_SPECIES } from './species/kronoberg';

// Where a species' give and protect advice comes from (T-319 · review B-67). The curated 54 have
// advice written for them; every catalogue species shows its group's advice (one give and one
// protect text per group, pipeline/media/content_templates.py). The card says so, and a pledge of
// group advice counts as one action for the group, however many species it was pledged on.
//
// Derived, not stored: today the rule is exact. The task that writes species-level advice for
// catalogue species (T-320) adds a stored scope to species_content and replaces this.

export type AdviceScope = 'species' | 'group';

const CURATED = new Set(KRONOBERG_SPECIES.map((s) => s.id));

export function adviceScope(speciesId: string): AdviceScope {
  return CURATED.has(speciesId) ? 'species' : 'group';
}

/**
 * Distinct help actions pledged: a group's give (or protect) advice is one action whatever number
 * of species it was pledged on; species-level advice, and any species whose group is unknown, count
 * per species.
 */
export function distinctActions(
  records: CollectionRecord[],
  groupOf: (speciesId: string) => SpeciesGroup | null,
): number {
  const actions = new Set<string>();
  for (const r of records) {
    if (r.helpedAt === null || r.helpedKind === null) continue;
    const group = adviceScope(r.speciesId) === 'group' ? groupOf(r.speciesId) : null;
    actions.add(group ? `group:${group}:${r.helpedKind}` : `species:${r.speciesId}:${r.helpedKind}`);
  }
  return actions.size;
}
