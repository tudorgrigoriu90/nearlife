/* global describe, it, expect */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const fs = require('fs');
const path = require('path');

// The Edge Function runs a transpiled copy of the app's push modules (scripts/edgeShared.js). If
// that copy is stale, the server would decide sends with different rules than the tested source.
const { buildEdgeShared, OUT_DIR } = require('../scripts/edgeShared');

function committedFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? committedFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

describe('supabase/functions/_shared/lib', () => {
  const expected = buildEdgeShared();

  it('is exactly what scripts/edgeShared.js generates — run `node scripts/edgeShared.js` if not', () => {
    expect(committedFiles(OUT_DIR).sort()).toEqual([...expected.keys()].sort());
    for (const [rel, text] of expected) {
      expect(fs.readFileSync(path.join(OUT_DIR, rel), 'utf8')).toBe(text);
    }
  });

  it('uses explicit .js specifiers on every relative import, as Deno requires', () => {
    for (const text of expected.values()) {
      for (const [, spec] of text.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
        expect(spec).toMatch(/\.js$/);
      }
    }
  });

  it('carries no React Native or Expo code into the server', () => {
    for (const text of expected.values()) {
      expect(text).not.toMatch(/from\s+['"](react|react-native|expo[\w-]*|@react-native[\w/-]*)['"]/);
    }
  });
});
