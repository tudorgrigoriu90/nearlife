import { useEffect, useState } from 'react';
import { almanacBase, collectedExtras } from '../lib/almanacCatalogue';
import type { Locale } from '../lib/i18n';
import type { Species } from '../lib/species/types';
import type { SpeciesRepository } from '../lib/speciesRepository';

// React glue for the Almanac's catalogue (T-208). The county list (~3,000 rows, a few pages) is
// read once per county + language; collecting a species only ever adds a small "extras" lookup for
// ids the county list lacks, rather than re-reading the whole catalogue.

export interface AlmanacCatalogue {
  species: Species[];
  loading: boolean;
}

export function useAlmanacCatalogue(
  repo: SpeciesRepository,
  regionId: string | null,
  locale: Locale,
  collectedIds: ReadonlySet<string>,
): AlmanacCatalogue {
  const [base, setBase] = useState<{ key: string; species: Species[] } | null>(null);
  const [extras, setExtras] = useState<Species[]>([]);
  const baseKey = `${regionId ?? 'preview'}|${locale}`;

  useEffect(() => {
    let cancelled = false;
    almanacBase(repo, regionId, locale)
      .then((species) => {
        if (!cancelled) setBase({ key: baseKey, species });
      })
      // A failed read shows an empty (not loading-forever) Almanac; the repository has already
      // fallen back to bundled data where it could, and logged why.
      .catch(() => {
        if (!cancelled) setBase({ key: baseKey, species: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [repo, regionId, locale, baseKey]);

  const collectedKey = [...collectedIds].sort().join(',');
  const current = base?.key === baseKey ? base.species : null;

  useEffect(() => {
    if (current === null) return;
    let cancelled = false;
    collectedExtras(repo, current, collectedKey ? collectedKey.split(',') : [], locale)
      .then((found) => {
        if (!cancelled) setExtras(found);
      })
      .catch(() => {
        if (!cancelled) setExtras([]);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, current, collectedKey, locale]);

  return current === null
    ? { species: [], loading: true }
    : { species: [...current, ...extras.filter((e) => !current.some((s) => s.id === e.id))], loading: false };
}
