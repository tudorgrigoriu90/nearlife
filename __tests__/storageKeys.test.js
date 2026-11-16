/* global describe, it, expect, __dirname */
const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');

// T-269 · review B-12: account deletion erases device storage by prefix (lib/deviceErase.ts). A
// store declared under another prefix would survive deletion; this fails when one appears.
const ERASED_PREFIXES = ['nearby.', 'sb-'];
const ROOT = join(__dirname, '..');

function sourceFiles() {
  return ['lib', 'components'].flatMap((dir) =>
    readdirSync(join(ROOT, dir), { recursive: true })
      .map(String)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
      .map((f) => join(ROOT, dir, f)),
  );
}

describe('device storage keys', () => {
  it('the erase prefixes here match lib/deviceErase.ts', () => {
    const src = readFileSync(join(ROOT, 'lib', 'deviceErase.ts'), 'utf8');
    expect(src).toContain("ERASED_PREFIXES = ['nearby.', 'sb-']");
  });

  it('every storage-key constant starts with an erased prefix', () => {
    const found = [];
    for (const f of sourceFiles()) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/KEY\s*=\s*['`]([^'`$]+)/g)) found.push(m[1]);
    }
    expect(found.length).toBeGreaterThan(8);
    // The export format name is a label inside the file, not a storage key.
    const uncovered = found.filter(
      (k) => k !== 'nearby.export.v2' && !ERASED_PREFIXES.some((p) => k.startsWith(p)),
    );
    expect(uncovered).toEqual([]);
  });
});
