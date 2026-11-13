import { groupOf, type SpeciesGroup } from './species/group';
import type { Month, Species } from './species/types';

// The card's county section (T-262): what the county's own records say about a species, in place
// of the generic "active in your region this season" line. Everything is derived from public
// records (GBIF via T-261): when in the year it is recorded and how often, never a claim about
// where it is right now (invariant #1). Records reflect where observers went, so the wording says
// "seen" and "records", not "lives" or "flowers".

/** Below this many records a monthly shape is noise, not a season. */
export const MIN_RECORDS_FOR_SEASON = 20;
/** A month counts as "seen" from this share of the busiest month: a stray record is not a season. */
const PRESENT_SHARE = 0.05;
/** Peak months: the busiest month, grown towards its busier neighbour while it has this share. */
const PEAK_SHARE = 0.7;
const PEAK_MAX_MONTHS = 3;
/** Ranks this high are worth stating ("no. 3 of 240 birds"); below, a plainer line. */
const RANK_SHOWN_UP_TO = 30;
/** The bottom share of a group's list counts as uncommon in the county. */
const UNCOMMON_SHARE = 0.3;

export type SeasonShape =
  | { kind: 'allYear'; peak: Month[]; visitor: null }
  | { kind: 'season'; from: Month; to: Month; peak: Month[]; visitor: 'summer' | 'winter' | null };

export type Standing =
  | { kind: 'rank'; rank: number; total: number; occurrences: number }
  | { kind: 'uncommon'; occurrences: number }
  | { kind: 'records'; occurrences: number };

export interface CountyStats {
  group: SpeciesGroup;
  occurrences: number;
  monthCounts: number[] | null;
  season: SeasonShape | null;
  standing: Standing;
}

const month = (i: number) => ((((i % 12) + 12) % 12) + 1) as Month;

/** The months a species is seen and its peak, from 12 monthly counts (January first). */
export function seasonShape(counts: number[], group?: SpeciesGroup): SeasonShape | null {
  const max = Math.max(...counts);
  if (!(max > 0)) return null;
  const present = counts.map((c) => c > 0 && c >= max * PRESENT_SHARE);
  const peak = peakMonths(counts, max);
  if (present.filter(Boolean).length >= 11) return { kind: 'allYear', peak, visitor: null };

  // The season is everything outside the longest run of empty months (which may wrap the year).
  let gapStart = 0;
  let gapLength = 0;
  for (let start = 0; start < 12; start++) {
    if (present[start]) continue;
    let length = 0;
    while (length < 12 && !present[(start + length) % 12]) length++;
    if (length > gapLength) [gapStart, gapLength] = [start, length];
  }
  const from = month(gapStart + gapLength);
  const to = month(gapStart - 1);
  const months = Array.from({ length: 12 - gapLength }, (_, i) => month(gapStart + gapLength + i));
  return { kind: 'season', from, to, peak, visitor: group === 'bird' ? visitorOf(months) : null };
}

/** The busiest month, grown one month at a time towards the busier neighbour. */
function peakMonths(counts: number[], max: number): Month[] {
  const at = (i: number) => counts[((i % 12) + 12) % 12];
  let left = counts.indexOf(max);
  let right = left;
  while (right - left + 1 < PEAK_MAX_MONTHS) {
    const before = at(left - 1);
    const after = at(right + 1);
    if (Math.max(before, after) < max * PEAK_SHARE) break;
    if (after >= before) right++;
    else left--;
  }
  return Array.from({ length: right - left + 1 }, (_, i) => month(left + i));
}

function visitorOf(months: Month[]): 'summer' | 'winter' | null {
  const has = (m: Month) => months.includes(m);
  if (months.every((m) => m >= 3 && m <= 10)) return 'summer';
  if ((has(12) || has(1) || has(2)) && !has(6) && !has(7)) return 'winter';
  return null;
}

/**
 * The species in its county: its season, and where it stands among its own group there.
 * `peers` is the county catalogue the species came from. Null for a species loaded without county
 * data (the bundled set, or a list read outside a county).
 */
export function countyStats(species: Species, peers: Species[]): CountyStats | null {
  const county = species.county;
  if (!county) return null;
  const group = groupOf(species);
  const ranked = peers
    .filter((p) => p.county && groupOf(p) === group)
    .sort((a, b) => b.county!.occurrences - a.county!.occurrences || a.id.localeCompare(b.id));
  const index = ranked.findIndex((p) => p.id === species.id);
  const total = ranked.length;
  const occurrences = county.occurrences;
  let standing: Standing;
  if (index >= 0 && index < RANK_SHOWN_UP_TO) {
    standing = { kind: 'rank', rank: index + 1, total, occurrences };
  } else if (index >= 0 && index >= total * (1 - UNCOMMON_SHARE)) {
    standing = { kind: 'uncommon', occurrences };
  } else {
    standing = { kind: 'records', occurrences };
  }
  const season =
    county.monthCounts && occurrences >= MIN_RECORDS_FOR_SEASON
      ? seasonShape(county.monthCounts, group)
      : null;
  return { group, occurrences, monthCounts: county.monthCounts, season, standing };
}
