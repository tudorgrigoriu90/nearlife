// i18n runtime (T-120). A lightweight, dependency-light localization layer: English is the
// source of truth (keys derive from it, so a missing key is a TYPE error, not a runtime blank),
// other locales fall back to English, and simple {name} interpolation is supported.
// Full strategy + the 24 EU target languages: docs/INTERNATIONALIZATION.md.

/** The 24 official EU languages (ISO 639-1). English is the base/fallback. */
export type Locale =
  | 'bg' | 'hr' | 'cs' | 'da' | 'nl' | 'en' | 'et' | 'fi' | 'fr' | 'de'
  | 'el' | 'hu' | 'ga' | 'it' | 'lv' | 'lt' | 'mt' | 'pl' | 'pt' | 'ro'
  | 'sk' | 'sl' | 'es' | 'sv';

export const SUPPORTED_LOCALES: Locale[] = [
  'bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'de',
  'el', 'hu', 'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro',
  'sk', 'sl', 'es', 'sv',
];

export const BASE_LOCALE: Locale = 'en';
/** Locales with reviewed content that are live for the alpha (all of Sweden). */
export const ALPHA_LOCALES: Locale[] = ['sv', 'en'];

// English catalog — the source of truth. Keys are derived from this object.
export const en = {
  'app.name': 'Nearby',
  'region.kronoberg': 'Kronoberg',
  'thisWeek.title': 'This week',
  'thisWeek.subtitle': '{region} · {count} species active in your area this season',
  'thisWeek.new': 'NEW',
  'thisWeek.empty': 'A quiet week — winter is resting season here.',
  'thisWeek.honesty': 'Active this season, never “here right now”.',
} as const;

export type TranslationKey = keyof typeof en;
/** A complete catalog must define every key (missing key → compile error). */
export type Catalog = Record<TranslationKey, string>;

// Swedish — full coverage for the alpha. Reviewed before shipping (INTERNATIONALIZATION.md).
const sv: Catalog = {
  'app.name': 'Nearby',
  'region.kronoberg': 'Kronoberg',
  'thisWeek.title': 'Denna vecka',
  'thisWeek.subtitle': '{region} · {count} arter aktiva i ditt område den här säsongen',
  'thisWeek.new': 'NY',
  'thisWeek.empty': 'En lugn vecka – vintern är vilosäsong här.',
  'thisWeek.honesty': 'Aktiv den här säsongen, aldrig ”här just nu”.',
};

const CATALOGS: Partial<Record<Locale, Catalog>> = { en, sv };

export type TParams = Record<string, string | number>;

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  );
}

/**
 * Translate `key` for `locale`, with `{name}` interpolation. Fallback chain:
 * requested locale → English base → the key itself (never blank).
 */
export function t(locale: Locale, key: TranslationKey, params?: TParams): string {
  const catalog = CATALOGS[locale] ?? CATALOGS[BASE_LOCALE];
  const template = catalog?.[key] ?? en[key] ?? key;
  return interpolate(template, params);
}

/** Bind a locale once (e.g. per screen): `const tr = createTranslator(locale)`. */
export function createTranslator(locale: Locale) {
  return (key: TranslationKey, params?: TParams): string => t(locale, key, params);
}

/** Whether a full, reviewed catalog exists for the locale (else it falls back to English). */
export function hasCatalog(locale: Locale): boolean {
  return CATALOGS[locale] !== undefined;
}
