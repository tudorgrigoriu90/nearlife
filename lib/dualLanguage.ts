import { isOfferableForDualDisplay, type ContentLocale } from './i18n/contentLocale';

// Mother-tongue dual display — settings state (T-148 · TASK-PLAN F13.3).
//
// Lets a user read species content in the app's language AND a second language of their choice at
// the same time (not by switching) — for immigrants cross-referencing their mother tongue against
// the country language. Pure state + rules; formatting is T-149, persistence is dualLanguageStore.
//
// **Off by default**, like every other opt-in in this app (no pre-enabled features). The user turns
// it on in Settings and picks the second language; nothing about the default experience changes.

export interface DualLanguageSettings {
  enabled: boolean;
  /** The user's second language. `null` until they pick one. */
  secondaryLocale: ContentLocale | null;
}

export const DEFAULT_DUAL_LANGUAGE: DualLanguageSettings = {
  enabled: false,
  secondaryLocale: null,
};

/**
 * Whether dual display should actually render right now. Four things must hold, and each fails
 * *silently into single-language display* rather than into a broken half-rendered card:
 *   1. the user enabled it,
 *   2. they picked a second language,
 *   3. it isn't the language the app is already in (a no-op pairing — nothing to compare),
 *   4. that language has content at all (`machine` is enough — T-152).
 *
 * (3) and (4) are re-checked here, not only at pick time, because both can change *after* the
 * choice: the user can switch the app's primary language to the one they picked as secondary, and
 * a locale with no content today gains it when T-154 seeds that language.
 */
export function isDualActive(
  settings: DualLanguageSettings,
  primaryLocale: ContentLocale,
): boolean {
  const { enabled, secondaryLocale } = settings;
  return (
    enabled &&
    secondaryLocale !== null &&
    secondaryLocale !== primaryLocale &&
    isOfferableForDualDisplay(secondaryLocale)
  );
}

/** Enabled but no language chosen yet — Settings should surface the picker, not silently no-op. */
export function needsLanguageChoice(settings: DualLanguageSettings): boolean {
  return settings.enabled && settings.secondaryLocale === null;
}

/**
 * Turn the feature on/off. Disabling **keeps** the chosen language: toggling off and back on
 * shouldn't make the user hunt through 40 languages again to get back where they were.
 */
export function setDualEnabled(
  settings: DualLanguageSettings,
  enabled: boolean,
): DualLanguageSettings {
  return { ...settings, enabled };
}

/**
 * Pick the second language. Choosing the language the app is already in is rejected as a no-op
 * pairing — it would render every line twice identically. Returns the settings unchanged so the
 * caller needs no special case; the UI marks the primary language unselectable anyway (T-151).
 */
export function setSecondaryLocale(
  settings: DualLanguageSettings,
  locale: ContentLocale,
  primaryLocale: ContentLocale,
): DualLanguageSettings {
  if (locale === primaryLocale) return settings;
  return { ...settings, secondaryLocale: locale };
}
