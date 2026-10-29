import type { CollectionRecord } from './collection';
import { seasonKeyOf } from './season';

// Collective-impact aggregation (T-128). Pure core of the impact counters (GDD §7, TSD
// `impact_counters`/`pledges`): turn a set of collection records into the numbers shown on the
// Helped tier and the community impact screen ("you + N others helped swifts this spring").
// The same function serves a single user's records or the union across a community.

export interface ImpactSummary {
  /** Distinct species that have been helped (spotted→helped). */
  helpedSpecies: number;
  /** Total help pledges (one recorded help action per species in this model). */
  totalPledges: number;
  /** Pledges of the "give" kind (put up a box, leave a patch wild, …). */
  give: number;
  /** Pledges of the "protect" kind (restraint — don't disturb, keep dogs leashed, …). */
  protect: number;
}

/**
 * Pledge totals, optionally limited to one season (T-216): the Impact screen says "this season",
 * and the community line beside it is seasonal, so the personal numbers must be too. Seasons use
 * the same key as free catches (December belongs to the next winter).
 */
export function impactSummary(
  records: CollectionRecord[],
  season?: string,
  seasonOfTimestamp: (iso: string) => string = (iso) => seasonKeyOf(new Date(iso)),
): ImpactSummary {
  const summary: ImpactSummary = { helpedSpecies: 0, totalPledges: 0, give: 0, protect: 0 };
  const helped = new Set<string>();
  for (const r of records) {
    if (r.helpedAt === null) continue;
    if (season !== undefined && seasonOfTimestamp(r.helpedAt) !== season) continue;
    helped.add(r.speciesId);
    summary.totalPledges += 1;
    if (r.helpedKind === 'give') summary.give += 1;
    else if (r.helpedKind === 'protect') summary.protect += 1;
  }
  summary.helpedSpecies = helped.size;
  return summary;
}
