import { SUPPORTED_LOCALES, type Locale } from './index';
import { LOCALE_STATUS, type ReviewStatus } from './coverage';

// Content locales for mother-tongue dual display (T-156 · TASK-PLAN F13.3).
//
// The dual-display feature (read species content in the country language AND your mother tongue at
// once) needs a language roster wider than the 24 official EU languages: Sweden's largest immigrant
// communities speak Arabic, Somali, Persian/Dari, Tigrinya and others that are not EU-official.
//
// **Why a separate type instead of widening `Locale`:** `Locale` drives the app's UI-string system,
// where `Catalog = Record<TranslationKey, string>` compile-forces a full translation of every UI
// string for each locale. Widening `Locale` would demand ~200 UI-chrome strings × 16 more languages
// — work that is explicitly out of scope here (the brief is *content* in a second language, not a
// second UI). `ContentLocale` is therefore additive and used only by species-content lookup and this
// feature's coverage tracking. UI chrome stays on `Locale`; the two are intentionally different sets.

/** Non-EU languages added for dual display, by immigrant population in Sweden (BCP-47 codes). */
export type ImmigrantLocale =
  | 'ar' // Arabic
  | 'so' // Somali
  | 'fa' // Persian / Dari
  | 'ps' // Pashto
  | 'ckb' // Central Kurdish (Sorani)
  | 'kmr' // Northern Kurdish (Kurmanji)
  | 'tr' // Turkish
  | 'ti' // Tigrinya
  | 'bs' // Bosnian
  | 'sr' // Serbian
  | 'sq' // Albanian
  | 'ru' // Russian
  | 'uk' // Ukrainian
  | 'th' // Thai
  | 'vi' // Vietnamese
  | 'am'; // Amharic

// Ordered by rough immigrant-population share in Sweden — this is the translation priority order
// (T-154 stages language by language). Director to confirm against Statistics Sweden data; the
// ordering is data, not logic, so re-ranking it is a one-line change. Candidates deliberately NOT
// added without Director sign-off: Mandarin (zh) and other sizeable-but-unranked communities.
export const IMMIGRANT_LOCALES: ImmigrantLocale[] = [
  'ar', 'so', 'fa', 'ti', 'ckb', 'tr', 'bs', 'sr', 'sq', 'ru', 'uk', 'ps', 'kmr', 'th', 'vi', 'am',
];

/** Every language species content may be displayed in: the 24 EU languages + the immigrant roster. */
export type ContentLocale = Locale | ImmigrantLocale;

export const CONTENT_LOCALES: ContentLocale[] = [...SUPPORTED_LOCALES, ...IMMIGRANT_LOCALES];

const IMMIGRANT_LOCALE_SET = new Set<string>(IMMIGRANT_LOCALES);

/** True for a locale outside the EU roster (i.e. dual-display-only, never a UI language). */
export function isImmigrantLocale(locale: ContentLocale): locale is ImmigrantLocale {
  return IMMIGRANT_LOCALE_SET.has(locale);
}

// Endonyms — each language written in its own script. This is a plain data table, NOT i18n catalog
// keys, because an endonym is by definition the same string in every UI language ("Soomaali" is
// "Soomaali" whether the app is in English or Swedish). Keeping it out of `Catalog` also avoids
// forcing 40 new keys into every UI locale. A mother-tongue picker must show endonyms: someone
// looking for their own language scans for its native name, not its English exonym.
export const LOCALE_ENDONYMS: Record<ContentLocale, string> = {
  // 24 official EU languages
  bg: 'Български', hr: 'Hrvatski', cs: 'Čeština', da: 'Dansk', nl: 'Nederlands',
  en: 'English', et: 'Eesti', fi: 'Suomi', fr: 'Français', de: 'Deutsch',
  el: 'Ελληνικά', hu: 'Magyar', ga: 'Gaeilge', it: 'Italiano', lv: 'Latviešu',
  lt: 'Lietuvių', mt: 'Malti', pl: 'Polski', pt: 'Português', ro: 'Română',
  sk: 'Slovenčina', sl: 'Slovenščina', es: 'Español', sv: 'Svenska',
  // Immigrant-community languages
  ar: 'العربية', so: 'Soomaali', fa: 'فارسی', ps: 'پښتو', ckb: 'کوردیی ناوەندی',
  kmr: 'Kurmancî', tr: 'Türkçe', ti: 'ትግርኛ', bs: 'Bosanski', sr: 'Српски',
  sq: 'Shqip', ru: 'Русский', uk: 'Українська', th: 'ไทย', vi: 'Tiếng Việt',
  am: 'አማርኛ',
};

/** A language's own name, for the picker. Falls back to the code so the row is never blank. */
export function endonymOf(locale: ContentLocale): string {
  return LOCALE_ENDONYMS[locale] ?? locale;
}

// Translation status for the immigrant roster. The EU languages keep their existing status in
// `coverage.ts` (LOCALE_STATUS) — that record governs whether a locale may become the *primary* UI
// language, a stricter bar (native review, T-125). These start `missing` and move to `machine` as
// T-154 seeds them; per T-152, `machine` is sufficient to offer in dual display.
export const IMMIGRANT_LOCALE_STATUS: Record<ImmigrantLocale, ReviewStatus> = {
  ar: 'machine', so: 'machine', fa: 'machine', ps: 'machine', ckb: 'machine',
  kmr: 'machine', tr: 'machine', ti: 'machine', bs: 'machine', sr: 'machine',
  sq: 'machine', ru: 'machine', uk: 'machine', th: 'machine', vi: 'machine',
  am: 'machine',
};

/** Translation status for any content locale (EU roster and immigrant roster alike). */
export function contentLocaleStatus(locale: ContentLocale): ReviewStatus {
  return isImmigrantLocale(locale) ? IMMIGRANT_LOCALE_STATUS[locale] : LOCALE_STATUS[locale];
}

// ── Dual-display policy (T-152, Director-resolved) ───────────────────────────
// Machine translation is sufficient here — no native-review gate, give/protect included — because
// dual display is a *supplementary* aid shown alongside the always-reviewed primary content, not a
// replacement for it. That is a deliberately lower bar than `isLiveForUsers` in coverage.ts, which
// still requires `reviewed` before a locale may become the primary UI language (T-125). The one
// carried-over requirement is honesty: machine-status content must be visibly labelled (T-153).

/** Offerable as a secondary language once *any* content exists — `machine` is enough (T-152). */
export function isOfferableForDualDisplay(locale: ContentLocale): boolean {
  return contentLocaleStatus(locale) !== 'missing';
}

/** Locales the secondary-language picker may list, in roster order. */
export function dualDisplayLocales(): ContentLocale[] {
  return CONTENT_LOCALES.filter(isOfferableForDualDisplay);
}

/** True when content in this locale must carry the "machine-translated" notice (invariant #1). */
export function needsMachineTranslationNotice(locale: ContentLocale): boolean {
  return contentLocaleStatus(locale) === 'machine';
}

/**
 * A content locale that has no content yet — for tests that need to exercise the not-translated
 * path. Derived rather than hardcoded so it stays valid as T-154 seeds languages one by one;
 * hardcoding one meant every new language broke a handful of unrelated tests.
 */
export function anUnseededContentLocale(): ContentLocale {
  const unseeded = CONTENT_LOCALES.find((l) => !isOfferableForDualDisplay(l));
  if (!unseeded) throw new Error('every content locale is seeded — update these tests');
  return unseeded;
}
