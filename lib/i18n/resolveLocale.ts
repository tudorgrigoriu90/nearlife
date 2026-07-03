import { BASE_LOCALE, type Locale, SUPPORTED_LOCALES } from './index';

// Pure locale resolution (T-123): map a BCP-47 language tag (e.g. "sv-SE") to a supported
// Locale, falling back to the English base for anything we don't localize. Kept expo-free so
// it is unit-testable; the device-locale wrapper lives in deviceLocale.ts.

const SUPPORTED = new Set<string>(SUPPORTED_LOCALES);

export function resolveLocale(languageTag: string | null | undefined): Locale {
  if (!languageTag) return BASE_LOCALE;
  const primary = languageTag.split('-')[0]?.toLowerCase() ?? '';
  return SUPPORTED.has(primary) ? (primary as Locale) : BASE_LOCALE;
}
