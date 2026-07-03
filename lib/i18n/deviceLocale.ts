import { getLocales } from 'expo-localization';
import type { Locale } from './index';
import { resolveLocale } from './resolveLocale';

// Device-locale wrapper (T-123). Thin I/O over expo-localization; the mapping logic is the
// unit-tested resolveLocale. Callers may override the result with a user-chosen locale from
// Settings (persisted), which takes precedence over the device value.

export function detectDeviceLocale(): Locale {
  const tag = getLocales()[0]?.languageTag;
  return resolveLocale(tag);
}
