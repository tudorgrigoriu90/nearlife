import type { CollectionRecord } from './collection';

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

export function impactSummary(records: CollectionRecord[]): ImpactSummary {
  const summary: ImpactSummary = { helpedSpecies: 0, totalPledges: 0, give: 0, protect: 0 };
  const helped = new Set<string>();
  for (const r of records) {
    if (r.helpedAt === null) continue;
    helped.add(r.speciesId);
    summary.totalPledges += 1;
    if (r.helpedKind === 'give') summary.give += 1;
    else if (r.helpedKind === 'protect') summary.protect += 1;
  }
  summary.helpedSpecies = helped.size;
  return summary;
}
