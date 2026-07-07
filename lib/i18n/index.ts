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

  // Onboarding — hometown confirm (T-023)
  'onboarding.hometown.title': 'Your home region',
  'onboarding.hometown.body': 'This is set once from your location and can’t be changed later.',
  'onboarding.hometown.cta': 'Confirm {region}',
  'preview.banner': 'Preview mode — allow location to set your home region.',

  // Onboarding — notification pre-prompt + first Spotted (T-024)
  'onboarding.notif.title': 'Never miss a season',
  'onboarding.notif.body':
    'A gentle nudge when a species is active in your region — a few a week, never spam.',
  'onboarding.notif.cta': 'Turn on nudges',
  'onboarding.firstSpotted.badge': 'Your first sighting!',
  'onboarding.firstSpotted.cta': 'Start exploring',

  // Catch minigame — bird timing (T-033)
  'minigame.instruction': 'Tap when the shrinking ring lines up with the target — that’s the dive.',
  'minigame.tapHint': 'Tap anywhere',
  'minigame.grade.perfect': 'Perfect!',
  'minigame.grade.good': 'Nice timing!',
  'minigame.grade.miss': 'Just missed',
  'minigame.success': 'Caught!',
  'minigame.fail': 'It got away',
  'minigame.continue': 'Continue',
  'minigame.cancel': 'Not now',

  // Catch flow + free-catch counter (T-034)
  'catch.remaining': '{count} free catches left this season',
  'catch.caught': 'You caught {name}!',
  'catch.continue': 'Keep exploring',
  'paywall.title': 'Out of free catches',
  'paywall.body': 'You’ve used your 3 free catches this season. The Full Game unlocks unlimited catching.',
  'paywall.freeMission': '✓ The mission is always free',
  'paywall.noAds': '✓ No ads. Ever.',
  'paywall.cta': 'Get the Full Game',
  'paywall.later': 'Maybe later',
  'paywall.soon': 'Purchases arrive with the Full Game (coming soon).',

  // Helped tier — give/protect pledge (T-076)
  'card.pledge': 'I’ll do this',
  'pledge.title': 'You’re helping {name}',
  'pledge.thanks': 'Thank you — small actions add up across the region.',
  'pledge.done': 'Done',

  // Settings (T-088 consent UI · T-101 attribution · T-123 locale override)
  'nav.settings': 'Settings',
  'settings.title': 'Settings',
  'settings.privacy': 'Privacy & consent',
  'consent.location': 'Location',
  'consent.notifications': 'Notifications',
  'consent.analytics': 'Analytics',
  'consent.hint': 'You choose what to share. Nothing is on by default, and there are no ads.',
  'settings.language': 'Language',
  'settings.dataAttribution': 'Data & attribution',
  'attribution.gbif': 'Species data: GBIF.org and its contributing datasets.',
  'attribution.osm': 'Habitat & maps: © OpenStreetMap contributors.',
  'settings.about': 'Nearby — Kronoberg alpha',
  'settings.done': 'Done',
  'lang.en': 'English',
  'lang.sv': 'Svenska',

  // Your data — export (T-092)
  'settings.yourData': 'Your data',
  'settings.exportData': 'Export my data',
  'export.title': 'Your data',
  'export.hint': 'Everything Nearby holds about you. Select the text to copy it.',
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

  // Onboarding — hometown confirm (T-023)
  'onboarding.hometown.title': 'Din hemregion',
  'onboarding.hometown.body': 'Den ställs in en gång från din plats och kan inte ändras senare.',
  'onboarding.hometown.cta': 'Bekräfta {region}',
  'preview.banner': 'Förhandsläge – tillåt plats för att ställa in din hemregion.',

  // Onboarding — notification pre-prompt + first Spotted (T-024)
  'onboarding.notif.title': 'Missa aldrig en säsong',
  'onboarding.notif.body':
    'En vänlig påminnelse när en art är aktiv i din region – några i veckan, aldrig spam.',
  'onboarding.notif.cta': 'Slå på påminnelser',
  'onboarding.firstSpotted.badge': 'Din första observation!',
  'onboarding.firstSpotted.cta': 'Börja utforska',

  // Catch minigame — bird timing (T-033)
  'minigame.instruction': 'Tryck när den krympande ringen möter målet – det är dyket.',
  'minigame.tapHint': 'Tryck var som helst',
  'minigame.grade.perfect': 'Perfekt!',
  'minigame.grade.good': 'Bra tajming!',
  'minigame.grade.miss': 'Nästan',
  'minigame.success': 'Fångad!',
  'minigame.fail': 'Den kom undan',
  'minigame.continue': 'Fortsätt',
  'minigame.cancel': 'Inte nu',

  // Catch flow + free-catch counter (T-034)
  'catch.remaining': '{count} gratis fångster kvar denna säsong',
  'catch.caught': 'Du fångade {name}!',
  'catch.continue': 'Fortsätt utforska',
  'paywall.title': 'Slut på gratis fångster',
  'paywall.body': 'Du har använt dina 3 gratis fångster denna säsong. Fullversionen låser upp obegränsat fångande.',
  'paywall.freeMission': '✓ Uppdraget är alltid gratis',
  'paywall.noAds': '✓ Inga annonser. Någonsin.',
  'paywall.cta': 'Skaffa fullversionen',
  'paywall.later': 'Kanske senare',
  'paywall.soon': 'Köp kommer med fullversionen (snart).',

  // Helped tier — give/protect pledge (T-076)
  'card.pledge': 'Jag gör detta',
  'pledge.title': 'Du hjälper {name}',
  'pledge.thanks': 'Tack – små handlingar gör skillnad i hela regionen.',
  'pledge.done': 'Klar',

  // Settings (T-088 consent UI · T-101 attribution · T-123 locale override)
  'nav.settings': 'Inställningar',
  'settings.title': 'Inställningar',
  'settings.privacy': 'Integritet & samtycke',
  'consent.location': 'Plats',
  'consent.notifications': 'Aviseringar',
  'consent.analytics': 'Analys',
  'consent.hint': 'Du väljer vad du delar. Inget är på från början, och det finns inga annonser.',
  'settings.language': 'Språk',
  'settings.dataAttribution': 'Data & källor',
  'attribution.gbif': 'Artdata: GBIF.org och dess bidragande dataset.',
  'attribution.osm': 'Habitat & kartor: © OpenStreetMap contributors.',
  'settings.about': 'Nearby — Kronoberg alfa',
  'settings.done': 'Klar',
  'lang.en': 'English',
  'lang.sv': 'Svenska',

  // Your data — export (T-092)
  'settings.yourData': 'Dina uppgifter',
  'settings.exportData': 'Exportera mina uppgifter',
  'export.title': 'Dina uppgifter',
  'export.hint': 'Allt Nearby har om dig. Markera texten för att kopiera den.',
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
