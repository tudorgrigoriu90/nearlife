import { contrastRatio, surfaces, textOnAccent, textOnDark, textOnLight } from './theme';

// T-291 · review I-24: every text colour meets WCAG AA (4.5 : 1) on every surface it is meant for.

describe('contrastRatio', () => {
  it('matches the WCAG 2.1 reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // The review's own figures for the old secondary text.
    expect(contrastRatio('#7a8a7c', '#ffffff')).toBeCloseTo(3.65, 1);
    expect(contrastRatio('#7a8a7c', '#f4f8f2')).toBeCloseTo(3.4, 1);
  });

  it('accepts three-digit colours', () => {
    expect(contrastRatio('#fff', '#ffffff')).toBeCloseTo(1, 5);
  });
});

const pairs = (texts: Record<string, string>, on: readonly string[]) =>
  Object.entries(texts).flatMap(([name, colour]) =>
    on.map((surface) => ({ name, colour, surface, ratio: contrastRatio(colour, surface) })),
  );

describe('theme text colours', () => {
  it.each([
    ['on light surfaces', textOnLight, surfaces.light],
    ['on dark surfaces', textOnDark, surfaces.dark],
    ['on accent surfaces', textOnAccent, surfaces.accent],
  ] as const)('every text colour %s is at least 4.5 : 1', (_label, texts, on) => {
    const failing = pairs(texts, on).filter((p) => p.ratio < 4.5);
    expect(failing).toEqual([]);
  });
});
