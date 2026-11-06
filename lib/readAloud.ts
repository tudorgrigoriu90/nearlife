// Read aloud (T-244). The species card is read by the phone's own text-to-speech (expo-speech):
// on the device, offline, free (invariant #7). For people learning Swedish it is also how they hear
// the names said. Nothing is sent anywhere.

import type { SpeciesContent } from './species/content';

/**
 * Off (Director, 2026-11-06, T-248): the phones' voices read the cards too poorly to ship. The
 * code stays, so turning this back on is the whole change once the voice quality is acceptable.
 */
export const READ_ALOUD_ENABLED = false;

/** Sentence-separated speech for a card: the name, then each text that exists. */
export function cardSpeech(
  name: string,
  content: Pick<SpeciesContent, 'fact' | 'whenAndHow' | 'give' | 'protect'> | null,
): string {
  const parts = [name, content?.fact, content?.whenAndHow, content?.give, content?.protect]
    .map((p) => (p ?? '').trim().replace(/[.!?]+$/, ''))
    .filter((p) => p.length > 0);
  return parts.map((p) => `${p}.`).join(' ');
}

// Regional voices where a language's default would be the wrong country (Brazilian for pt,
// American for en); and the voice tag where it differs from the app's locale code.
const VOICE_TAG: Record<string, string> = {
  sv: 'sv-SE',
  en: 'en-GB',
  pt: 'pt-PT',
  es: 'es-ES',
  fr: 'fr-FR',
  kmr: 'ku',
  ckb: 'ckb',
};

export function speechLanguage(locale: string): string {
  return VOICE_TAG[locale] ?? locale;
}

/**
 * Whether the phone has a voice for `locale`. Offering a language it can't speak would read, say,
 * Romanian text with a Swedish voice: worse than no button.
 */
export function hasVoiceFor(voices: readonly { language: string }[], locale: string): boolean {
  const wanted = speechLanguage(locale).split('-')[0].toLowerCase();
  return voices.some((v) => v.language.replace('_', '-').split('-')[0].toLowerCase() === wanted);
}
