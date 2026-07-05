import type { Locale } from './i18n';

// Copy-honesty enforcement (T-066 · invariant #1, GDD §3). All user-facing copy describes the
// season/behaviour — "active in your region this season" — and never claims the species is
// present at this moment ("here right now"). This module is the single source of truth for the
// banned real-time-presence phrases; the test (contentHonesty.test.ts) runs it across every
// species content field AND every i18n catalog string, in each live locale, so no string can
// overclaim presence without failing the build.

/** Real-time-presence phrases that break the honesty rule, per locale (lower-case, substring). */
export const REALTIME_CLAIM_PHRASES: Partial<Record<Locale, string[]>> = {
  en: ['right now', 'here now', 'here right now', 'currently here', 'near you now', 'at this moment'],
  sv: ['just nu', 'här nu', 'just här'],
};

/** Banned phrases found in `text` for `locale` (case-insensitive). Empty = honest. */
export function findRealtimeClaims(text: string, locale: Locale): string[] {
  const phrases = REALTIME_CLAIM_PHRASES[locale] ?? REALTIME_CLAIM_PHRASES.en ?? [];
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase));
}

/** True when `text` makes no real-time-presence claim for `locale`. */
export function isHonest(text: string, locale: Locale): boolean {
  return findRealtimeClaims(text, locale).length === 0;
}
