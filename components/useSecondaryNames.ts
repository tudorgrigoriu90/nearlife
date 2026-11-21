import { useEffect, useState } from 'react';
import type { ContentLocale } from '../lib/i18n/contentLocale';
import type { SpeciesRepository } from '../lib/speciesRepository';

// Second-language names for a few species (T-387): the card's "Often confused with" (at most
// three). The catalogue is read in the app language only, so these are read one by one, the way
// the card reads its own second-language content. A failed read leaves that name out.

export function useSecondaryNames(
  repo: Pick<SpeciesRepository, 'getContentInLocale'>,
  ids: string[],
  locale: ContentLocale | null,
): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = ids.join(',');
  useEffect(() => {
    if (locale === null || key === '') return;
    let cancelled = false;
    void Promise.all(
      key.split(',').map((id) =>
        repo
          .getContentInLocale(id, locale)
          .then((c) => (c?.commonName ? ([[id, c.commonName]] as const) : []))
          .catch(() => []),
      ),
    ).then((found) => {
      if (!cancelled) setNames(Object.fromEntries(found.flat()));
    });
    return () => {
      cancelled = true;
    };
  }, [repo, key, locale]);
  return locale === null ? {} : names;
}
