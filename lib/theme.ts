// The app's text colours and the surfaces they sit on (T-291 · review I-24).
//
// Every text colour here is at least 4.5 : 1 (WCAG 2.1 AA, normal text) against every surface in
// its group, checked by lib/theme.test.ts; __tests__/textColours.test.js fails when a component
// colours text with anything not listed here. Components still write the hex literal in their
// StyleSheets: moving every style to named imports is the dark-mode work (I-26), which needs a
// second palette anyway. Disabled and busy controls (#bcd0bd, #7fa886) are exempt from contrast
// under WCAG and are not listed as surfaces.

// keep: T-292 — textOnLight, textOnDark, textOnAccent and contrastRatio are the palette the
// contrast tests check and __tests__/textColours.test.js holds components to.
/** Text on the app background, white cards and the pale green and amber tints. */
export const textOnLight = {
  ink: '#22331f',
  inkSoft: '#2f3d2c',
  heading: '#2f5d34',
  leaf: '#3a5a3d',
  link: '#2f5d8a',
  body: '#4a5c4d',
  /** Secondary text, hints, placeholders, the unearned tier mark. Was #7a8a7c (3.4 : 1). */
  muted: '#566658',
  /** Green text. The button green #3a7d44 is 3.8 : 1 on the pale tints, so text uses this. */
  accent: '#336f3c',
  accentDeep: '#296f46',
  amber: '#7a5a1f',
  rust: '#8a4b1f',
  error: '#b3261e',
  warning: '#ab3d2d',
} as const;

// keep: T-292 — see textOnLight.
/** Text in the minigames and the export's JSON view. */
export const textOnDark = {
  white: '#ffffff',
  mist: '#dbe7dc',
  pale: '#cfe6d1',
  gold: '#e3d08f',
  mint: '#8fe3a1',
  coral: '#e39a8f',
  sage: '#7fa588',
} as const;

// keep: T-292 — see textOnLight.
/** Text on filled buttons and chips. */
export const textOnAccent = {
  white: '#fff',
} as const;

export const surfaces = {
  light: [
    '#ffffff',
    '#f4f8f2',
    '#eef4ec',
    '#eef2ec',
    '#eceeea',
    '#eaf4ea',
    '#eaf3e6',
    '#e7f2e7',
    '#e5f0e2',
    '#e2ebe0',
    '#cfe5cf',
    '#fbe9c6',
  ],
  dark: ['#0a1710', '#0e1f14', '#1c3a28'],
  accent: ['#3a7d44', '#2f7d4f', '#b3261e', '#1c3a28', '#0e1f14'],
} as const;

function channel(hex: string, i: number): number {
  const c = parseInt(hex.slice(i, i + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(colour: string): number {
  let h = colour.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return 0.2126 * channel(h, 0) + 0.7152 * channel(h, 2) + 0.0722 * channel(h, 4);
}

// keep: T-292 — see textOnLight.
/** WCAG 2.1 contrast ratio between two #rgb / #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
