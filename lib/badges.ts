import { spottedIds, type CollectionRecord } from './collection';
import type { Species, SpeciesCategory } from './species/types';

// Badges & completion (T-082 core · GDD §8). Pure computation of which badges a collection has
// earned, from the collection records + the species catalogue. Category-completion and count
// milestones are derivable now; habitat/season badges arrive with the real data layer (E3).
// Badge *labels* are i18n and rendered by the UI (T-082); this module owns the earn rules only.

export type BadgeKind = 'category' | 'spotted-milestone' | 'helped-milestone';

export interface Badge {
  id: string;
  kind: BadgeKind;
}

export const SPOTTED_MILESTONES = [10, 25, 50] as const;
export const HELPED_MILESTONES = [1, 5, 10] as const;

/** Category-completion badge id for a category (all its species spotted). */
export function categoryBadgeId(category: SpeciesCategory): string {
  return `category-complete-${category}`;
}

/** Badge ids the collection has earned, in a stable order (categories → spotted → helped). */
export function earnedBadges(records: CollectionRecord[], species: Species[]): string[] {
  const spotted = spottedIds(records);
  const earned: string[] = [];

  // Category completion — every species in the category spotted.
  const categories = [...new Set(species.map((s) => s.category))];
  for (const category of categories) {
    const inCategory = species.filter((s) => s.category === category);
    if (inCategory.length > 0 && inCategory.every((s) => spotted.has(s.id))) {
      earned.push(categoryBadgeId(category));
    }
  }

  // Spotted count milestones.
  for (const milestone of SPOTTED_MILESTONES) {
    if (spotted.size >= milestone) earned.push(`spotted-${milestone}`);
  }

  // Helped count milestones.
  const helpedCount = records.filter((r) => r.helpedAt !== null).length;
  for (const milestone of HELPED_MILESTONES) {
    if (helpedCount >= milestone) earned.push(`helped-${milestone}`);
  }

  return earned;
}
