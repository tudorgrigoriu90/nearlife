import {
  DEFAULT_DUAL_LANGUAGE,
  isDualActive,
  needsLanguageChoice,
  setDualEnabled,
  setSecondaryLocale,
  type DualLanguageSettings,
} from './dualLanguage';

const on = (secondaryLocale: DualLanguageSettings['secondaryLocale']): DualLanguageSettings => ({
  enabled: true,
  secondaryLocale,
});

describe('DEFAULT_DUAL_LANGUAGE', () => {
  it('is off with no language chosen (no pre-enabled features)', () => {
    expect(DEFAULT_DUAL_LANGUAGE).toEqual({ enabled: false, secondaryLocale: null });
  });
});

describe('isDualActive', () => {
  it('is active when enabled with a different, available second language', () => {
    // sv is `machine` status — sufficient for dual display per T-152.
    expect(isDualActive(on('sv'), 'en')).toBe(true);
  });

  it('is inactive while the feature is off, even with a language chosen', () => {
    expect(isDualActive({ enabled: false, secondaryLocale: 'sv' }, 'en')).toBe(false);
  });

  it('is inactive before a language is chosen', () => {
    expect(isDualActive(on(null), 'en')).toBe(false);
  });

  it('is inactive when the second language IS the app language (no-op pairing)', () => {
    expect(isDualActive(on('sv'), 'sv')).toBe(false);
  });

  it('is inactive for a language with no content at all', () => {
    // ar has no seeded content yet (T-154) — falls back to single-language, never a blank half.
    expect(isDualActive(on('ar'), 'en')).toBe(false);
  });

  it('re-checks the primary collision at render time, not only at pick time', () => {
    // User picks Swedish as secondary while the app is English, then switches the app to Swedish.
    const picked = setSecondaryLocale(on(null), 'sv', 'en');
    expect(isDualActive(picked, 'en')).toBe(true);
    expect(isDualActive(picked, 'sv')).toBe(false);
  });
});

describe('needsLanguageChoice', () => {
  it('is true when enabled with nothing picked — Settings must surface the picker', () => {
    expect(needsLanguageChoice(on(null))).toBe(true);
  });

  it('is false once a language is picked, and while the feature is off', () => {
    expect(needsLanguageChoice(on('sv'))).toBe(false);
    expect(needsLanguageChoice(DEFAULT_DUAL_LANGUAGE)).toBe(false);
  });
});

describe('setDualEnabled', () => {
  it('turns the feature on and off', () => {
    expect(setDualEnabled(DEFAULT_DUAL_LANGUAGE, true).enabled).toBe(true);
    expect(setDualEnabled(on('sv'), false).enabled).toBe(false);
  });

  it('remembers the chosen language while off, so re-enabling restores it', () => {
    const off = setDualEnabled(on('sv'), false);
    expect(off.secondaryLocale).toBe('sv');
    expect(isDualActive(setDualEnabled(off, true), 'en')).toBe(true);
  });

  it('does not mutate the input', () => {
    const before = on('sv');
    setDualEnabled(before, false);
    expect(before.enabled).toBe(true);
  });
});

describe('setSecondaryLocale', () => {
  it('records the chosen language', () => {
    expect(setSecondaryLocale(on(null), 'sv', 'en').secondaryLocale).toBe('sv');
  });

  it('accepts a language from the wider immigrant roster', () => {
    expect(setSecondaryLocale(on(null), 'ar', 'sv').secondaryLocale).toBe('ar');
  });

  it('rejects picking the language the app is already in', () => {
    const before = on(null);
    expect(setSecondaryLocale(before, 'en', 'en')).toEqual(before);
  });

  it('does not mutate the input', () => {
    const before = on(null);
    setSecondaryLocale(before, 'sv', 'en');
    expect(before.secondaryLocale).toBeNull();
  });
});
