import { type Locale, SUPPORTED_LOCALES } from './index';

// Locale coverage & review status (T-124). Tracks, per language, how far its localization has
// progressed. A locale only goes live for users in a market once its content is `reviewed` —
// give/protect advice is law-sensitive and must have native review (INTERNATIONALIZATION.md,
// T-125). This is the honest gate that stops half-translated or raw-MT content from shipping.

export type ReviewStatus =
  | 'missing' // no localized content yet → falls back to English
  | 'machine' // seeded (MT / first-pass), NOT yet native-reviewed → do not ship
  | 'reviewed'; // native-reviewed → safe to offer to users

// Declared status per language. Updated as translations are produced and reviewed.
// en: the source of truth. sv: UI + common names done, content pending (T-127) + review.
export const LOCALE_STATUS: Record<Locale, ReviewStatus> = {
  en: 'reviewed',
  sv: 'machine',
  bg: 'missing', hr: 'missing', cs: 'missing', da: 'missing', nl: 'missing',
  et: 'missing', fi: 'missing', fr: 'missing', de: 'missing', el: 'missing',
  hu: 'missing', ga: 'missing', it: 'missing', lv: 'missing', lt: 'missing',
  mt: 'missing', pl: 'missing', pt: 'missing', ro: 'missing', sk: 'missing',
  sl: 'missing', es: 'missing',
};

/** A locale may be offered to users only when its content is native-reviewed. */
export function isLiveForUsers(locale: Locale): boolean {
  return LOCALE_STATUS[locale] === 'reviewed';
}

/** Locales currently safe to offer to users. */
export function liveLocales(): Locale[] {
  return SUPPORTED_LOCALES.filter(isLiveForUsers);
}

/** Count of locales in each status — a simple rollout dashboard. */
export function translationProgress(): Record<ReviewStatus, number> {
  const counts: Record<ReviewStatus, number> = { missing: 0, machine: 0, reviewed: 0 };
  for (const locale of SUPPORTED_LOCALES) counts[LOCALE_STATUS[locale]] += 1;
  return counts;
}
