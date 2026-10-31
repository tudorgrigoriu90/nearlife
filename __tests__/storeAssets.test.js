/* global describe, it, expect, __dirname */
// Plain JS: it reads files with Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync } = require('fs');
const { createHash } = require('crypto');
const { join } = require('path');

// T-097: Google Play rejects graphics of the wrong size, and the first build must not ship
// Expo's template icon. Sizes come from the PNG header (width and height at bytes 16-23).

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p));
const size = (p) => {
  const b = read(p);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const sha = (p) => createHash('sha256').update(read(p)).digest('hex').slice(0, 16);

// The blue "A" placeholders that `create-expo-app` ships.
const EXPO_TEMPLATE = { 'assets/icon.png': '119462bb78eb240a', 'assets/android-icon-foreground.png': '9e3d0315a33c6799' };

describe('store and app icons', () => {
  it('has Play listing graphics at the sizes Play requires', () => {
    expect(size('docs/launch/store-assets/play-icon-512.png')).toEqual([512, 512]);
    expect(size('docs/launch/store-assets/feature-graphic-en.png')).toEqual([1024, 500]);
    expect(size('docs/launch/store-assets/feature-graphic-sv.png')).toEqual([1024, 500]);
  });

  it('ships 1024px app icons, none of them the Expo template', () => {
    for (const p of ['assets/icon.png', 'assets/android-icon-foreground.png', 'assets/android-icon-background.png', 'assets/android-icon-monochrome.png']) {
      expect(size(p)).toEqual([1024, 1024]);
    }
    for (const [p, template] of Object.entries(EXPO_TEMPLATE)) expect(sha(p)).not.toBe(template);
  });

  it('gives the adaptive icon a fallback colour from the icon background', () => {
    const { expo } = JSON.parse(read('app.json').toString('utf8'));
    expect(expo.android.adaptiveIcon.backgroundColor).toBe('#1c3a28');
  });
});
