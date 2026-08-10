import type { ContentLocale } from '../i18n/contentLocale';
import { KRONOBERG_CONTENT, type SpeciesContent } from './content';
import { AR_CONTENT } from './content.ar';
import { SV_CONTENT } from './content.sv';
import { AR_NAMES } from './names.ar';
import { SV_NAMES } from './names.sv';
import type { Species } from './types';

// Locale-aware species lookups (T-122). Common names and content are resolved by locale with a
// fallback to the English base (INTERNATIONALIZATION.md). English content lives in content.ts
// and English names are `species.commonName`. Swedish common names are wired here now; full
// Swedish content (fact/when-how/give/protect) is translated separately in T-127 and registered
// in CONTENT_BY_LOCALE — until then, Swedish content falls back to English.
//
// Keyed by `ContentLocale`, not `Locale` (T-156): species content is also shown in the wider
// mother-tongue roster (non-EU immigrant languages) that the UI-string system deliberately does not
// cover. Unseeded locales simply miss the lookup and fall back to English, exactly as before.

const CONTENT_BY_LOCALE: Partial<Record<ContentLocale, Record<string, SpeciesContent>>> = {
  en: KRONOBERG_CONTENT,
  sv: SV_CONTENT, // T-127 — machine status, native review pending (INTERNATIONALIZATION.md)
  ar: AR_CONTENT, // T-154 — machine status; dual-display aid only (T-152), never a primary UI language
};

const NAMES_BY_LOCALE: Partial<Record<ContentLocale, Record<string, string>>> = {
  sv: SV_NAMES,
  ar: AR_NAMES,
  // English names come from species.commonName (the base).
};

/** Localized common name, falling back to the English name on `species`. */
export function commonNameFor(species: Species, locale: ContentLocale): string {
  return NAMES_BY_LOCALE[locale]?.[species.id] ?? species.commonName;
}

/** Localized card content, falling back to the English base; undefined if the species is unknown. */
export function contentFor(speciesId: string, locale: ContentLocale): SpeciesContent | undefined {
  return CONTENT_BY_LOCALE[locale]?.[speciesId] ?? KRONOBERG_CONTENT[speciesId];
}

/**
 * Content in **exactly** this locale, with no English fallback (T-154).
 *
 * The mother-tongue half of dual display must use this, not `contentFor`. Falling back would mean
 * a user reading the app in Swedish with Arabic as their second language silently gets *English*
 * for any species Arabic hasn't covered yet — a third language they never asked for, presented as
 * if it were their own. Returning nothing instead collapses that field to single-language, which
 * is the honest outcome.
 */
export function contentInLocale(
  speciesId: string,
  locale: ContentLocale,
): SpeciesContent | undefined {
  return CONTENT_BY_LOCALE[locale]?.[speciesId];
}

/** Common name in exactly this locale, or undefined. English resolves to the base name. */
export function commonNameInLocale(species: Species, locale: ContentLocale): string | undefined {
  if (locale === 'en') return species.commonName;
  return NAMES_BY_LOCALE[locale]?.[species.id];
}
