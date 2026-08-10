import { type ContentLocale } from './contentLocale';

// Bidirectional-text support for dual display (T-157 · TASK-PLAN F13.3).
//
// INTERNATIONALIZATION.md notes the 24 EU languages are all left-to-right, so the app has never
// needed RTL work. The mother-tongue roster (T-156) breaks that: Arabic, Persian/Dari, Pashto and
// Sorani Kurdish are written right-to-left. Dual display puts an RTL string *next to* an LTR one on
// an otherwise LTR screen, so the problem here is **mixed direction within one screen** — not full
// app RTL mirroring (out of scope: the layout, navigation and chrome stay LTR).
//
// Scripts, not languages, decide direction: Kurmanji Kurdish (kmr) is Latin-script and LTR while
// Sorani (ckb) is Arabic-script and RTL — the same language family, opposite directions. Tigrinya
// and Amharic use Ge'ez, which is LTR despite being non-Latin.

/** Content locales written right-to-left (Arabic-script languages in the T-156 roster). */
export const RTL_CONTENT_LOCALES = new Set<ContentLocale>(['ar', 'fa', 'ps', 'ckb']);

export function isRtlLocale(locale: ContentLocale): boolean {
  return RTL_CONTENT_LOCALES.has(locale);
}

/** React Native `Text` writingDirection for a locale's own paragraph. */
export function writingDirectionFor(locale: ContentLocale): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

/** Text alignment so an RTL paragraph starts at its natural (right) edge. */
export function textAlignFor(locale: ContentLocale): 'left' | 'right' {
  return isRtlLocale(locale) ? 'right' : 'left';
}

// Unicode isolate controls (UAX #9). FSI auto-detects the direction of the text it wraps and
// isolates it from its surroundings; PDI closes the isolate.
//
// Why this is needed rather than plain concatenation: in `"Rödhake / العربية"` the separator and
// spaces are *directionally neutral*, so the bidi algorithm resolves them from the surrounding
// strong characters. Next to an RTL run those neutrals get pulled into it, and the "/" visually
// jumps to the wrong side of the Arabic text — the two halves appear swapped or the delimiter
// lands mid-phrase. Isolating each half keeps the delimiter anchored between them regardless of
// either side's direction. This is the standard fix and it is why the join must not be a bare
// template literal.
export const FSI = '⁨'; // FIRST STRONG ISOLATE
export const PDI = '⁩'; // POP DIRECTIONAL ISOLATE

/**
 * Wrap `text` in a directional isolate so its direction cannot leak into neighbouring text.
 * Empty input is returned untouched — an isolate around nothing is pure noise in the output.
 */
export function isolate(text: string): string {
  return text === '' ? '' : `${FSI}${text}${PDI}`;
}

/** Strip isolate controls — for tests and for comparing/measuring the human-readable text. */
export function stripIsolates(text: string): string {
  return text.split(FSI).join('').split(PDI).join('');
}
