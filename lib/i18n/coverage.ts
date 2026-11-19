import type { Locale } from './index';

// Locale coverage & review status (T-124). Tracks, per language, how far its content has
// progressed. `contentLocale.ts` reads it to decide which languages may be offered beside the
// interface language, and pipeline/tests/test_templates_i18n.py reads it for the template roster.
// Which languages the interface itself speaks is ALPHA_LOCALES (T-312); the old `isLiveForUsers`
// gate described a native-review rule nothing enforced and went in T-325.

export type ReviewStatus =
  | 'missing' // no localized content yet → falls back to English
  | 'machine' // seeded (MT / first-pass), NOT yet native-reviewed → do not ship
  | 'reviewed'; // native-reviewed → safe to offer to users

// Declared status per language. Updated as translations are produced and reviewed.
// en: the source of truth. sv: UI + common names done, content pending (T-127) + review.
export const LOCALE_STATUS: Record<Locale, ReviewStatus> = {
  en: 'reviewed',
  sv: 'machine',
  bg: 'machine', hr: 'machine', cs: 'machine', da: 'machine', nl: 'machine',
  et: 'machine', fi: 'machine', fr: 'machine', de: 'machine', el: 'machine',
  hu: 'machine', ga: 'missing', it: 'machine', lv: 'machine', lt: 'machine',
  mt: 'missing', pl: 'machine', pt: 'machine', ro: 'machine', sk: 'machine',
  sl: 'machine', es: 'machine',
};
