/* global describe, it, expect, __dirname */
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

// T-398: every caption has a shot of that name in the walk, and every shot has a caption.
describe('store screenshot frames', () => {
  it('captions exactly the shots the walker takes', () => {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const { CAPTIONS } = require('../scripts/store-assets/frames.js');
    const walker = readFileSync(join(__dirname, '..', 'scripts', 'store-assets', 'screenshots.js'), 'utf8');
    const shots = [...walker.matchAll(/shot\('([\w-]+)'/g)].map((m) => m[1]).sort();
    expect(Object.keys(CAPTIONS.sv).sort()).toEqual(shots);
  });

  it('keeps the honest-copy rule: never "here right now"', () => {
    const { CAPTIONS } = require('../scripts/store-assets/frames.js');
    for (const caption of Object.values(CAPTIONS.sv)) expect(caption).not.toMatch(/just nu|här och nu/i);
  });
});
