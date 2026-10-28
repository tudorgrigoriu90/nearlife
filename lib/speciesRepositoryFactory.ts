import { createClient } from '@supabase/supabase-js';
import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';

import type { SpeciesContent } from './species/content';
import {
  HardcodedSpeciesRepository,
  SupabaseSpeciesGateway,
  SupabaseSpeciesRepository,
  type LocalizedSpecies,
  type RegionPresence,
  type SpeciesRepository,
  type SpeciesSummary,
} from './speciesRepository';
import { getSupabaseConfig, hasSupabaseConfig } from './supabaseConfig';

export type { SpeciesRepository };

// Choosing the species source (T-057).
//
// The database is now the more complete source — 11,936 species and content in all 38 locales,
// against 54 bundled — so the app reads from it. But the swap is not a straight substitution: the
// bundled data is *always* available and the network is not. Without a fallback one failed request
// empties the almanac, which is worse than showing 54 species and a regression against the
// offline-first behaviour T-165 established for the collection.
//
// The fallback deliberately triggers on *failure only*, never on an empty result. An empty result
// is an answer: falling back there would show bundled content for a species the database has no row
// for, and for `getContentInLocale` it would surface a language the user never chose — which is the
// precise thing that method exists to prevent.

export class FallbackSpeciesRepository implements SpeciesRepository {
  constructor(
    private readonly primary: SpeciesRepository,
    private readonly backup: SpeciesRepository,
  ) {}

  private async attempt<T>(
    run: (repo: SpeciesRepository) => Promise<T>,
    what: string,
  ): Promise<T> {
    try {
      return await run(this.primary);
    } catch (error) {
      // Logged, not swallowed: a silent fallback makes a persistent outage look like a small
      // catalogue, which is exactly the kind of thing nobody notices for weeks.
      console.warn(`species ${what} fell back to bundled data`, error);
      return run(this.backup);
    }
  }

  listSpecies(locale: Locale): Promise<LocalizedSpecies[]> {
    return this.attempt((r) => r.listSpecies(locale), 'list');
  }

  getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    return this.attempt((r) => r.getContent(speciesId, locale), 'content');
  }

  getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    return this.attempt((r) => r.getContentInLocale(speciesId, locale), 'content-in-locale');
  }

  regionPresence(regionId: string): Promise<RegionPresence[]> {
    return this.attempt((r) => r.regionPresence(regionId), 'presence');
  }

  describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]> {
    return this.attempt((r) => r.describeSpecies(ids, locale), 'describe');
  }
}

/**
 * The app's species source: Supabase when configured, bundled data otherwise.
 *
 * Unconfigured is a supported state, not an error — the README documents running with no
 * `.env.local` at all, and `useCollection` already behaves this way (T-165). It keeps the app
 * launchable before anyone has touched Supabase.
 */
export function createSpeciesRepository(): SpeciesRepository {
  const bundled = new HardcodedSpeciesRepository();
  if (!hasSupabaseConfig()) return bundled;
  const { url, publishableKey } = getSupabaseConfig();
  const client = createClient(url, publishableKey);
  return new FallbackSpeciesRepository(
    new SupabaseSpeciesRepository(new SupabaseSpeciesGateway(client)),
    bundled,
  );
}
