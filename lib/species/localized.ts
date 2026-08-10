import type { ContentLocale } from '../i18n/contentLocale';
import { KRONOBERG_CONTENT, type SpeciesContent } from './content';
import { AR_CONTENT } from './content.ar';
import { SO_CONTENT } from './content.so';
import { FA_CONTENT } from './content.fa';
import { TI_CONTENT } from './content.ti';
import { CKB_CONTENT } from './content.ckb';
import { TR_CONTENT } from './content.tr';
import { BS_CONTENT } from './content.bs';
import { SR_CONTENT } from './content.sr';
import { SQ_CONTENT } from './content.sq';
import { RU_CONTENT } from './content.ru';
import { UK_CONTENT } from './content.uk';
import { PS_CONTENT } from './content.ps';
import { KMR_CONTENT } from './content.kmr';
import { TH_CONTENT } from './content.th';
import { VI_CONTENT } from './content.vi';
import { AM_CONTENT } from './content.am';
import { PL_CONTENT } from './content.pl';
import { SV_CONTENT } from './content.sv';
import { AR_NAMES } from './names.ar';
import { SO_NAMES } from './names.so';
import { FA_NAMES } from './names.fa';
import { TI_NAMES } from './names.ti';
import { CKB_NAMES } from './names.ckb';
import { TR_NAMES } from './names.tr';
import { BS_NAMES } from './names.bs';
import { SR_NAMES } from './names.sr';
import { SQ_NAMES } from './names.sq';
import { RU_NAMES } from './names.ru';
import { UK_NAMES } from './names.uk';
import { PS_NAMES } from './names.ps';
import { KMR_NAMES } from './names.kmr';
import { TH_NAMES } from './names.th';
import { VI_NAMES } from './names.vi';
import { AM_NAMES } from './names.am';
import { PL_NAMES } from './names.pl';
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

export const CONTENT_BY_LOCALE: Partial<Record<ContentLocale, Record<string, SpeciesContent>>> = {
  en: KRONOBERG_CONTENT,
  sv: SV_CONTENT, // T-127 — machine status, native review pending (INTERNATIONALIZATION.md)
  so: SO_CONTENT, // T-154
  fa: FA_CONTENT, // T-154
  ti: TI_CONTENT, // T-154
  ckb: CKB_CONTENT, // T-154
  tr: TR_CONTENT, // T-154
  bs: BS_CONTENT, // T-154
  sr: SR_CONTENT, // T-154
  sq: SQ_CONTENT, // T-154
  ru: RU_CONTENT, // T-154
  uk: UK_CONTENT, // T-154
  ps: PS_CONTENT, // T-154
  kmr: KMR_CONTENT, // T-154
  th: TH_CONTENT, // T-154
  vi: VI_CONTENT, // T-154
  am: AM_CONTENT, // T-154
  pl: PL_CONTENT, // T-154
  ar: AR_CONTENT, // T-154 — machine status; dual-display aid only (T-152), never a primary UI language
};

export const NAMES_BY_LOCALE: Partial<Record<ContentLocale, Record<string, string>>> = {
  sv: SV_NAMES,
  so: SO_NAMES,
  fa: FA_NAMES,
  ti: TI_NAMES,
  ckb: CKB_NAMES,
  tr: TR_NAMES,
  bs: BS_NAMES,
  sr: SR_NAMES,
  sq: SQ_NAMES,
  ru: RU_NAMES,
  uk: UK_NAMES,
  ps: PS_NAMES,
  kmr: KMR_NAMES,
  th: TH_NAMES,
  vi: VI_NAMES,
  am: AM_NAMES,
  pl: PL_NAMES,
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

/** Locales with bundled content beyond the English base — the roster tests iterate over this. */
export function seededContentLocales(): ContentLocale[] {
  return (Object.keys(CONTENT_BY_LOCALE) as ContentLocale[]).filter((l) => l !== 'en');
}
