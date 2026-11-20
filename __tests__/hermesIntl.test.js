/* global describe, it, expect, __dirname */
// T-369: Hermes on Android implements only Intl.Collator, Intl.DateTimeFormat and Intl.NumberFormat.
// Jest runs on Node, which has every Intl API, so a call to another one passes the tests and throws
// on the phone (Intl.PluralRules crashed This Week; found by the emulator flows, T-367). Any use
// must sit behind a `typeof Intl.X === 'function'` check in the same file.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative } = require('path');

const ROOT = join(__dirname, '..');
const MISSING = ['PluralRules', 'Segmenter', 'ListFormat', 'RelativeTimeFormat', 'DisplayNames', 'Locale'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out.push(p);
  }
  return out;
}

describe('Intl APIs Hermes does not have', () => {
  it('are only called behind a check', () => {
    const offenders = [...walk(join(ROOT, 'lib')), ...walk(join(ROOT, 'components')), join(ROOT, 'App.tsx')]
      .filter((f) => !f.includes(`${join('lib', 'database.types.ts')}`))
      .flatMap((f) => {
        const src = readFileSync(f, 'utf8');
        return MISSING.filter(
          (api) => new RegExp(`Intl\\.${api}\\b`).test(src) && !new RegExp(`typeof Intl\\.${api} === 'function'`).test(src),
        ).map((api) => `${relative(ROOT, f)}: Intl.${api}`);
      });
    expect(offenders).toEqual([]);
  });
});
