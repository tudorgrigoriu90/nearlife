/* global describe, it, expect */
// Plain JS: the screenshot walker is a Node script (scripts/store-assets/screenshots.js).
const { label, LABEL_KEYS } = require('../scripts/store-assets/screenshots.js');

// T-226: the walker taps buttons by their visible text, read from lib/i18n. A renamed key would
// otherwise only show up as a skipped screenshot in CI.
describe('store screenshot walker', () => {
  it.each(['en', 'sv'])('finds every button label it taps in %s', (locale) => {
    for (const key of LABEL_KEYS) expect(label(key, locale, { region: 'Kronoberg' })).not.toBe('');
  });

  it('reads the language asked for and fills placeholders', () => {
    expect(label('onboarding.hometown.cta', 'en', { region: 'Kronoberg' })).toBe('Confirm Kronoberg');
    expect(label('nav.settings', 'sv')).toBe('Inställningar');
  });
});
