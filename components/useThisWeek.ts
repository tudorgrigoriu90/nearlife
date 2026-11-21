import { useEffect, useState } from 'react';
import type { Locale } from '../lib/i18n';
import type { Month } from '../lib/species/types';
import type { RegionPresence, SpeciesRepository } from '../lib/speciesRepository';
import { liveThisWeek, type LiveThisWeek } from '../lib/thisWeekLive';

// React glue for the county This Week (T-207). Presence is loaded once per county; re-ordering for
// a newly spotted species or a language switch re-describes only the shown rows. Returns null
// until there is something to show — and stays null with no hometown, in which case the screen
// keeps its bundled preview list.

export interface ThisWeekState {
  live: LiveThisWeek | null;
  /** T-275 · review B-15: the screen shows the bundled list only in `preview`. */
  status: 'preview' | 'loading' | 'error' | 'ready';
  retry: () => void;
}

export function useThisWeek(
  repo: SpeciesRepository,
  regionId: string | null,
  month: Month,
  spottedIds: ReadonlySet<string>,
  locale: Locale,
  /** Species "Show me" leaves out (T-390), applied before the list is cut; null = none. */
  hidden: ReadonlySet<string> | null = null,
): ThisWeekState {
  const [presence, setPresence] = useState<{ regionId: string; rows: RegionPresence[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [live, setLive] = useState<LiveThisWeek | null>(null);

  useEffect(() => {
    if (regionId === null) return;
    let cancelled = false;
    repo
      .regionPresence(regionId)
      .then((rows) => {
        if (!cancelled) setPresence({ regionId, rows });
      })
      // No saved copy and no server: the screen says so and offers a retry (T-275), never another
      // county's species.
      .catch((e: unknown) => {
        console.warn('this week presence failed', e);
        if (!cancelled) setFailed(`${regionId}#${attempt}`);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, regionId, attempt]);

  // A Set's identity changes on every render; key the effect on its contents instead.
  const spottedKey = [...spottedIds].sort().join(',');

  useEffect(() => {
    if (presence === null || presence.regionId !== regionId) return;
    let cancelled = false;
    const rows = hidden ? presence.rows.filter((r) => !hidden.has(r.speciesId)) : presence.rows;
    liveThisWeek(rows, month, new Set(spottedKey ? spottedKey.split(',') : []), locale, (ids, loc) =>
      repo.describeSpecies(ids, loc),
    )
      .then((next) => {
        if (!cancelled) setLive(next);
      })
      .catch((e: unknown) => console.warn('this week describe failed', e));
    return () => {
      cancelled = true;
    };
  }, [repo, presence, regionId, month, spottedKey, locale, hidden]);

  const retry = () => setAttempt((n) => n + 1);
  if (regionId === null) return { live: null, status: 'preview', retry };
  if (presence?.regionId === regionId && live !== null) return { live, status: 'ready', retry };
  if (failed === `${regionId}#${attempt}`) return { live: null, status: 'error', retry };
  return { live: null, status: 'loading', retry };
}
