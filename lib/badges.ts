import { spottedIds, type CollectionRecord } from './collection';
import { seasonKeyOf } from './season';
import { groupOf, type SpeciesGroup } from './species/group';
import type { Species } from './species/types';

// Badges & completion (T-082 core · GDD §8 · reshaped by T-212). Pure computation of which badges
// a collection has earned, from the collection records + the species list on screen. Badge
// *labels* are i18n and rendered by the UI; this module owns the earn rules only.
//
// T-212 (Director, 2026-10-31): "every species in the group" stopped being a goal once a county
// list held ~2,900 species (~300 birds in Kronoberg). Each group now has bronze/silver/gold tiers
// at 10/50/150 spotted, and a group small enough to finish (six reptiles) also gets "all of
// them". The ladder always has a next rung in reach, in any county and at any catalogue size.

export type BadgeKind = 'group-tier' | 'spotted-milestone' | 'helped-milestone' | 'season-opener';

export const GROUP_TIERS = [10, 50, 150] as const;
export const SPOTTED_MILESTONES = [10, 25, 50, 100, 250, 500] as const;
export const HELPED_MILESTONES = [1, 5, 10] as const;

export interface BadgeStatus {
  id: string;
  kind: BadgeKind;
  /** Group tiers only. */
  group?: SpeciesGroup;
  /** The number to reach. */
  count: number;
  /** Group tiers only: this rung is "every species in the group". */
  all: boolean;
  /** Where the collection stands against `count`. */
  progress: number;
  earned: boolean;
}

/** The tiers a group of `total` species offers: 10/50/150 below its size, plus "all" if ≤ 150. */
export function groupTiers(total: number): number[] {
  const tiers: number[] = GROUP_TIERS.filter((t) => t < total);
  if (total <= GROUP_TIERS[GROUP_TIERS.length - 1]) tiers.push(total);
  return tiers.filter((t) => t > 0);
}

export function badgeStatuses(records: CollectionRecord[], species: Species[], now: Date): BadgeStatus[] {
  const spotted = spottedIds(records);
  const statuses: BadgeStatus[] = [];

  const groups = new Map<SpeciesGroup, Species[]>();
  for (const s of species) {
    const g = groupOf(s);
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  for (const [group, members] of groups) {
    const have = members.filter((s) => spotted.has(s.id)).length;
    for (const count of groupTiers(members.length)) {
      statuses.push({
        id: `group-${group}-${count}`,
        kind: 'group-tier',
        group,
        count,
        all: count === members.length,
        progress: Math.min(have, count),
        earned: have >= count,
      });
    }
  }

  const season = seasonKeyOf(now);
  const openedSeason = records.some((r) => r.spottedAt !== null && seasonKeyOf(new Date(r.spottedAt)) === season);
  statuses.push({ id: `season-${season}`, kind: 'season-opener', count: 1, all: false, progress: openedSeason ? 1 : 0, earned: openedSeason });

  for (const count of SPOTTED_MILESTONES) {
    statuses.push({ id: `spotted-${count}`, kind: 'spotted-milestone', count, all: false, progress: Math.min(spotted.size, count), earned: spotted.size >= count });
  }
  const helped = records.filter((r) => r.helpedAt !== null).length;
  for (const count of HELPED_MILESTONES) {
    statuses.push({ id: `helped-${count}`, kind: 'helped-milestone', count, all: false, progress: Math.min(helped, count), earned: helped >= count });
  }
  return statuses;
}

/** Ids of the earned badges, in the same stable order (groups → season → spotted → helped). */
export function earnedBadges(records: CollectionRecord[], species: Species[], now: Date = new Date()): string[] {
  return badgeStatuses(records, species, now)
    .filter((b) => b.earned)
    .map((b) => b.id);
}
