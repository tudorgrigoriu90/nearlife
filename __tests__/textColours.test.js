/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative } = require('path');

// T-291 · review I-24: a component may only colour text with a theme colour, so the contrast test
// in lib/theme.test.ts covers every text colour the app shows.

const ROOT = join(__dirname, '..');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [p] : [];
  });
}

const full = (hex) => {
  const h = hex.toLowerCase().replace('#', '');
  return '#' + (h.length === 3 ? [...h].map((c) => c + c).join('') : h);
};

const THEME = readFileSync(join(ROOT, 'lib', 'theme.ts'), 'utf8');
const textBlock = THEME.slice(THEME.indexOf('export const textOnLight'), THEME.indexOf('export const surfaces'));
const allowed = new Set([...textBlock.matchAll(/'(#[0-9a-fA-F]{3,6})'/g)].map((m) => full(m[1])));

describe('text colours in components', () => {
  it('the theme defines text colours', () => {
    expect(allowed.size).toBeGreaterThan(10);
  });

  it('every text colour is a theme colour', () => {
    const stray = [];
    for (const file of [...files(join(ROOT, 'components')), join(ROOT, 'App.tsx')]) {
      const src = readFileSync(file, 'utf8');
      const uses = [
        ...src.matchAll(/\bcolor: '(#[0-9a-fA-F]{3,6})'/g),
        ...src.matchAll(/placeholderTextColor=["{']+(#[0-9a-fA-F]{3,6})/g),
      ];
      for (const m of uses) {
        if (!allowed.has(full(m[1]))) stray.push(`${relative(ROOT, file)}: ${m[1]}`);
      }
    }
    expect(stray).toEqual([]);
  });
});
