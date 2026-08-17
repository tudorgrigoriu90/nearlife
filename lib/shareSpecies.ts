import { createTranslator, type Locale } from './i18n';

// Species share text (T-059). Kept pure + separate from the card so the copy is unit-testable.
// Honest copy (invariant #1): season-framed, never "here right now". No upsell (invariant #4) — a
// share is a delight moment and stays clean. Text only for now; a deep link arrives with the
// store / deep-linking work (there's nothing public to link to yet).
export function buildShareMessage(name: string, locale: Locale = 'en'): string {
  return createTranslator(locale)('share.message', { name });
}
