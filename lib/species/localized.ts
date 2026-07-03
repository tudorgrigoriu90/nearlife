import type { Locale } from '../i18n';
import { KRONOBERG_CONTENT, type SpeciesContent } from './content';
import { SV_CONTENT } from './content.sv';
import { SV_NAMES } from './names.sv';
import type { Species } from './types';

// Locale-aware species lookups (T-122). Common names and content are resolved by locale with a
// fallback to the English base (INTERNATIONALIZATION.md). English content lives in content.ts
// and English names are `species.commonName`. Swedish common names are wired here now; full
// Swedish content (fact/when-how/give/protect) is translated separately in T-127 and registered
// in CONTENT_BY_LOCALE — until then, Swedish content falls back to English.

const CONTENT_BY_LOCALE: Partial<Record<Locale, Record<string, SpeciesContent>>> = {
  en: KRONOBERG_CONTENT,
  sv: SV_CONTENT, // T-127 — machine status, native review pending (INTERNATIONALIZATION.md)
};

const NAMES_BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  sv: SV_NAMES,
  // English names come from species.commonName (the base).
};

/** Localized common name, falling back to the English name on `species`. */
export function commonNameFor(species: Species, locale: Locale): string {
  return NAMES_BY_LOCALE[locale]?.[species.id] ?? species.commonName;
}

/** Localized card content, falling back to the English base; undefined if the species is unknown. */
export function contentFor(speciesId: string, locale: Locale): SpeciesContent | undefined {
  return CONTENT_BY_LOCALE[locale]?.[speciesId] ?? KRONOBERG_CONTENT[speciesId];
}
