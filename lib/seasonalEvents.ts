import { groupOf, type SpeciesGroup } from './species/group';
import type { Month, Species } from './species/types';

// Seasonal events (T-357 · review F-17), derived per county from the monthly records instead of
// four fixed Kronoberg windows (T-080, T-275). Each event has a curated name and an indicator, a
// species or a whole group, and is shown in a county only in the months its records there show
// it. Where the records are too few, it is shown nowhere: the salmon run had 11 records in
// Kronoberg, so it is not claimed there. "First frost" went: no species record shows frost.
//
// Two shapes:
//  - arrival: the first month in the window whose records are at least JUMP times the month
//    before and at least ARRIVAL_SHARE of the year's (swifts: 83 in April, 2,780 in May);
//  - peak: the months in the window with at least PEAK_SHARE of the busiest month's records
//    (cranes: March and April).
// Records are past years', so the copy says "usually", never "now" (invariant #1).

export const MIN_RECORDS = 100;
export const JUMP = 4;
export const ARRIVAL_SHARE = 0.05;
export const PEAK_SHARE = 0.7;

export interface SeasonalEvent {
  id: string;
  indicator: { scientificName: string } | { group: SpeciesGroup };
  shape: 'arrival' | 'peak';
  /** The months the event can fall in, so a stray autumn jump is never called a spring arrival. */
  window: Month[];
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  { id: 'crane-gathering', indicator: { scientificName: 'Grus grus' }, shape: 'peak', window: [3, 4, 5] },
  { id: 'swift-arrival', indicator: { scientificName: 'Apus apus' }, shape: 'arrival', window: [4, 5, 6] },
  { id: 'cuckoo-arrival', indicator: { scientificName: 'Cuculus canorus' }, shape: 'arrival', window: [4, 5, 6] },
  { id: 'mushroom-season', indicator: { group: 'fungus' }, shape: 'peak', window: [7, 8, 9, 10, 11] },
  { id: 'salmon-run', indicator: { scientificName: 'Salmo salar' }, shape: 'peak', window: [8, 9, 10, 11] },
];

function countsFor(event: SeasonalEvent, species: Species[]): number[] | null {
  const ind = event.indicator;
  const members = species.filter((s) =>
    'group' in ind ? groupOf(s) === ind.group : s.scientificName === ind.scientificName,
  );
  const series = members.map((s) => s.county?.monthCounts).filter((c): c is number[] => Array.isArray(c) && c.length === 12);
  if (series.length === 0) return null;
  return Array.from({ length: 12 }, (_, i) => series.reduce((sum, c) => sum + c[i], 0));
}

/** The months `event` falls in for a county, from its species list; empty when the records don't show it. */
export function eventMonths(event: SeasonalEvent, species: Species[]): Month[] {
  const counts = countsFor(event, species);
  if (counts === null) return [];
  const total = counts.reduce((a, b) => a + b, 0);
  if (total < MIN_RECORDS) return [];
  if (event.shape === 'arrival') {
    const m = event.window.find((month) => {
      const here = counts[month - 1];
      const before = counts[(month + 10) % 12];
      return here >= JUMP * before && here >= ARRIVAL_SHARE * total && here > 0;
    });
    return m === undefined ? [] : [m];
  }
  const peak = Math.max(...counts);
  return event.window.filter((month) => counts[month - 1] >= PEAK_SHARE * peak);
}

/** The ids of the events under way in `month` for a county's species list, in definition order. */
export function seasonalEvents(species: Species[], month: Month): string[] {
  return SEASONAL_EVENTS.filter((e) => eventMonths(e, species).includes(month)).map((e) => e.id);
}
