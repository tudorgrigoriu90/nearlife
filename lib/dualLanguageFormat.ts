import { isolate } from './i18n/bidi';
import type { ContentLocale } from './i18n/contentLocale';

// Dual-text formatting core (T-149 · TASK-PLAN F13.3). Turns a primary/secondary text pair into
// what the card renders: a title joined with "/" and body text stacked one language after another
// (sequential, never interleaved sentence-by-sentence — the brief).
//
// **Why the body returns segments instead of one joined string:** an RTL secondary (Arabic,
// Persian/Dari, Pashto, Sorani) needs its own `writingDirection` and text alignment, which only
// works if it is a separate `Text` element (T-157). A `"a\n\nb"` string would collapse both halves
// into one run and make the RTL half unstylable. The title is a single line, so it stays a string —
// there the two halves are held apart by bidi isolates instead.
//
// The correctness property throughout is **graceful degradation**: any missing, empty or duplicate
// secondary collapses to ordinary single-language output. There is never a dangling delimiter, a
// blank second paragraph, or an `undefined` on screen (invariant #1 — the UI states only what is
// true).

/** Separator between the two halves of a title, per the brief. */
export const DUAL_TITLE_DELIMITER = ' / ';

export interface DualTextInput {
  primary: string;
  primaryLocale: ContentLocale;
  /** The mother-tongue text. Absent/empty when this field isn't translated yet. */
  secondary?: string | null;
  secondaryLocale?: ContentLocale | null;
}

export interface DualTextSegment {
  text: string;
  locale: ContentLocale;
  /** True for the mother-tongue half — rendered in its own direction and carries the MT notice. */
  isSecondary: boolean;
}

/**
 * The secondary half, or null when it shouldn't render. Dropped when: there is no locale for it,
 * the text is missing or blank, or it is identical to the primary — showing a line twice teaches
 * the reader nothing and just looks broken.
 */
function resolveSecondary(input: DualTextInput): { text: string; locale: ContentLocale } | null {
  const { secondary, secondaryLocale, primary } = input;
  if (secondaryLocale == null || secondary == null) return null;
  const text = secondary.trim();
  if (text === '') return null;
  if (text === primary.trim()) return null;
  return { text, locale: secondaryLocale };
}

/**
 * Title line: `"Primary / Secondary"`, each half bidi-isolated so the delimiter stays between them
 * even when one side is right-to-left (T-157). With no secondary, the primary is returned exactly
 * as-is — no isolates, no trailing delimiter.
 */
export function dualTitle(input: DualTextInput): string {
  const secondary = resolveSecondary(input);
  if (!secondary) return input.primary;
  return `${isolate(input.primary)}${DUAL_TITLE_DELIMITER}${isolate(secondary.text)}`;
}

/**
 * Body paragraphs in reading order: primary first, then the mother tongue. One segment when there
 * is no secondary, so callers render dual and single-language content through the same path.
 */
export function dualSegments(input: DualTextInput): DualTextSegment[] {
  const segments: DualTextSegment[] = [
    { text: input.primary, locale: input.primaryLocale, isSecondary: false },
  ];
  const secondary = resolveSecondary(input);
  if (secondary) {
    segments.push({ text: secondary.text, locale: secondary.locale, isSecondary: true });
  }
  return segments;
}

/** True when the pair actually produced a second half (i.e. dual display is visibly happening). */
export function hasSecondary(input: DualTextInput): boolean {
  return resolveSecondary(input) !== null;
}
