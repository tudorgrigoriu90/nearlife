/* global describe, it, expect, __dirname */
// T-367 · review I-12: the end-to-end build switch stays out of store builds, and the Maestro
// flows tap labels that exist in the English catalogue.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');
const { placeholder, PACKAGE } = require('../scripts/e2eGoogleServices');

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function flowFiles(dir = join(ROOT, '.maestro'), out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) flowFiles(p, out);
    else if (name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

describe('end-to-end build switch', () => {
  it('no store build profile or app config turns it on', () => {
    for (const f of ['eas.json', 'app.json', 'app.config.js']) expect(read(f)).not.toMatch(/EXPO_PUBLIC_E2E/);
  });

  it('only the emulator workflow sets it', () => {
    const setters = readdirSync(join(ROOT, '.github/workflows')).filter((f) =>
      /EXPO_PUBLIC_E2E/.test(read(`.github/workflows/${f}`)),
    );
    expect(setters).toEqual(['e2e.yml']);
  });

  it('the placeholder Firebase file names the app and holds no real key', () => {
    const json = placeholder();
    expect(json.client[0].client_info.android_client_info.package_name).toBe(PACKAGE);
    expect(read('app.json')).toContain(`"package": "${PACKAGE}"`);
    expect(JSON.stringify(json)).not.toMatch(/AIza/);
  });
});

describe('Maestro flows', () => {
  const I18N = read('lib/i18n/index.ts');
  const en = I18N.slice(0, I18N.indexOf('const sv: Catalog'));
  const values = [...en.matchAll(/^\s+'[\w.-]+': '((?:[^'\\]|\\.)*)',$/gm)].map((m) => m[1].replace(/\\'/g, "'"));
  const asPattern = (v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.+')}$`);
  const patterns = values.map(asPattern);

  it('every plain label a flow taps or waits for is an English string of the app', () => {
    const labels = flowFiles()
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?:tapOn|visible|assertVisible|element): "([^"]+)"/g)])
      .map((m) => m[1])
      .filter((l) => !/[.*]/.test(l.replace(/\.$/, ''))); // regex matches are checked on the emulator
    expect(labels.length).toBeGreaterThan(8);
    // Android's own words, on its system dialogs: not the app's.
    const SYSTEM = new Set(['Wait']);
    const unknown = labels.filter((l) => !SYSTEM.has(l) && !patterns.some((p) => p.test(l)));
    expect(unknown).toEqual([]);
  });
});
