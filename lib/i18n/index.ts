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

  // Almanac (T-025)
  'almanac.title': 'Almanac',
  'almanac.empty': 'Your almanac is waiting — spot your first species.',
  'almanac.loading': 'Loading your almanac…',
  'almanac.filter.all': 'All',
  'almanac.progress': '{discovered} of {total} spotted',

  // Category labels (Almanac filter chips)
  'category.bird': 'Birds',
  'category.mammal': 'Mammals',
  'category.insect': 'Insects',
  'category.plant': 'Plants',
  'category.fish': 'Fish',
  'category.fungus': 'Fungi',

  // Three tiers
  'tier.spotted': 'Spotted',
  'tier.caught': 'Caught',
  'tier.helped': 'Helped',

  // Species card (T-026)
  'card.give': 'Give',
  'card.protect': 'Protect',
  'card.findNearby': 'Find it nearby',
  'card.depth': 'Depth',
  'card.locked': 'Play to unlock',
  'card.notSpotted': 'Not spotted yet',
  'card.back': 'Back',
  'card.followLaw':
    'Always follow local rules — access rights, protected species, and feeding differ by place.',

  // Onboarding — welcome + location pre-prompt (T-022)
  'onboarding.welcome.title': 'Welcome to Nearby',
  'onboarding.welcome.body':
    'Discover the wild lives sharing your corner of the world — season by season.',
  'onboarding.welcome.cta': 'Get started',
  'onboarding.location.title': 'Find species near you',
  'onboarding.location.body':
    'Nearby checks your location once to set your home region, then asks the OS for permission.',
  'onboarding.location.privacy': 'Used once, then discarded — only your region is kept, never coordinates.',
  'onboarding.location.cta': 'Continue',
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

  // Almanac (T-025)
  'almanac.title': 'Almanacka',
  'almanac.empty': 'Din almanacka väntar – hitta din första art.',
  'almanac.loading': 'Laddar din almanacka…',
  'almanac.filter.all': 'Alla',
  'almanac.progress': '{discovered} av {total} sedda',

  // Category labels (Almanac filter chips)
  'category.bird': 'Fåglar',
  'category.mammal': 'Däggdjur',
  'category.insect': 'Insekter',
  'category.plant': 'Växter',
  'category.fish': 'Fiskar',
  'category.fungus': 'Svampar',

  // Three tiers
  'tier.spotted': 'Sedd',
  'tier.caught': 'Fångad',
  'tier.helped': 'Hjälpt',

  // Species card (T-026)
  'card.give': 'Ge',
  'card.protect': 'Skydda',
  'card.findNearby': 'Hitta den i närheten',
  'card.depth': 'Fördjupning',
  'card.locked': 'Spela för att låsa upp',
  'card.notSpotted': 'Inte sedd ännu',
  'card.back': 'Tillbaka',
  'card.followLaw':
    'Följ alltid lokala regler – allemansrätten, fridlysta arter och matning skiljer sig åt beroende på plats.',

  // Onboarding — welcome + location pre-prompt (T-022)
  'onboarding.welcome.title': 'Välkommen till Nearby',
  'onboarding.welcome.body':
    'Upptäck de vilda liven som delar ditt hörn av världen – säsong för säsong.',
  'onboarding.welcome.cta': 'Kom igång',
  'onboarding.location.title': 'Hitta arter nära dig',
  'onboarding.location.body':
    'Nearby kollar din plats en gång för att ställa in din hemregion och frågar sedan operativsystemet om tillåtelse.',
  'onboarding.location.privacy': 'Används en gång och kastas sedan – bara din region sparas, aldrig koordinater.',
  'onboarding.location.cta': 'Fortsätt',
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
