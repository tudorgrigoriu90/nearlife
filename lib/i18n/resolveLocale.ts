import { ALPHA_LOCALES, BASE_LOCALE, type Locale } from './index';

// Pure locale resolution (T-123): map a BCP-47 language tag (e.g. "sv-SE") to the interface
// language, falling back to the English base. Kept expo-free so it is unit-testable; the
// device-locale wrapper lives in deviceLocale.ts.
//
// Only languages with interface strings (ALPHA_LOCALES: Swedish, English) are returned (T-312 ·
// review B-44). Any other EU code used to be accepted, which gave a German phone English menus,
// German species text and no ticked row in the language picker. The language decides, not the
// region: someone whose phone is in Arabic or German is likelier to read English than Swedish.

const SUPPORTED = new Set<string>(ALPHA_LOCALES);

export function resolveLocale(languageTag: string | null | undefined): Locale {
  if (!languageTag) return BASE_LOCALE;
  const primary = languageTag.split('-')[0]?.toLowerCase() ?? '';
  return SUPPORTED.has(primary) ? (primary as Locale) : BASE_LOCALE;
}
