import type { Locale } from './i18n';
import type { Month, Species } from './species/types';
import type { RegionPresence, SpeciesSummary } from './speciesRepository';
import { seasonShifts } from './seasonShift';
import { thisWeekFromPresence, type ThisWeekState } from './thisWeekProduction';

// This Week over the user's own county (T-207). `thisWeekFromPresence` (T-078) orders the
// county's active species; this adds the display data for the ones actually shown. A county has
// ~2,000 species active in summer, so only the top of the list is described — loading names and
// text for all of them would be a large download for rows nobody scrolls to.

/** How many rows the screen shows. The subtitle still counts every active species. */
export const THIS_WEEK_SHOWN = 50;

export interface LiveThisWeekItem {
  species: Species;
  commonName: string;
  detail: string | null;
  isNew: boolean;
}

export interface LiveThisWeek {
  state: ThisWeekState;
  /** Every species active in the county this month, not just the ones shown. */
  total: number;
  items: LiveThisWeekItem[];
  /** Usually arriving next month, and usually leaving (T-340 · review F-02); empty when none. */
  arriving: LiveThisWeekItem[];
  leaving: LiveThisWeekItem[];
}

export async function liveThisWeek(
  presence: RegionPresence[],
  month: Month,
  spottedIds: ReadonlySet<string>,
  locale: Locale,
  describe: (ids: string[], locale: Locale) => Promise<SpeciesSummary[]>,
): Promise<LiveThisWeek> {
  const result = thisWeekFromPresence(presence, month, spottedIds);
  const top = result.entries.slice(0, THIS_WEEK_SHOWN);
  const isNew = new Map(top.map((e) => [e.speciesId, e.isNew]));
  const shifts = seasonShifts(presence, month);
  // One read for the list and both shift rows: a species can be in both.
  const ids = [...new Set([...top.map((e) => e.speciesId), ...shifts.arriving, ...shifts.leaving])];
  const summaries = await describe(ids, locale);
  const byId = new Map(summaries.map((s) => [s.species.id, s]));
  const item = (id: string): LiveThisWeekItem[] => {
    const s = byId.get(id);
    return s ? [{ ...s, isNew: isNew.get(id) ?? !spottedIds.has(id) }] : [];
  };
  return {
    state: result.state,
    total: result.entries.length,
    items: top.flatMap((e) => item(e.speciesId)),
    arriving: shifts.arriving.flatMap(item),
    leaving: shifts.leaving.flatMap(item),
  };
}
