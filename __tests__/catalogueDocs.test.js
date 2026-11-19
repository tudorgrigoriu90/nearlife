/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// T-287 · review B-57: the headline catalogue size in README.md and CLAUDE.md is the one in
// pipeline/data/catalogue.json. A reload that changes the catalogue fails here until the docs say so.

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const META = JSON.parse(read('pipeline/data/catalogue.json')).meta;

/** The first bold "**N species**" and "**P%**" in a file. */
function headline(text) {
  const species = text.match(/\*\*([\d,]+) species\*\*/);
  const pct = text.match(/\*\*([\d.]+)%\*\*/);
  return {
    species: species ? Number(species[1].replace(/,/g, '')) : null,
    pct: pct ? Number(pct[1]) : null,
  };
}

describe('catalogue size in the docs', () => {
  it.each(['README.md', 'CLAUDE.md'])('%s states the shipped catalogue', (file) => {
    expect(headline(read(file))).toEqual({
      species: META.includedSpecies,
      pct: META.includedObservationPct,
    });
  });
});

describe('docs that described an earlier product', () => {
  it('README prices the Full Game at the ECONOMY price', () => {
    expect(read('README.md')).not.toMatch(/Full Game \$9\.99/);
    expect(read('README.md')).toMatch(/Full Game 49 SEK/);
  });

  it('no top-level doc calls v1 Nordic', () => {
    expect(read('README.md')).not.toMatch(/widening the catalogue to the Nordics/);
    expect(read('docs/README.md')).not.toMatch(/v1 scope:\*\* the five Nordic countries/);
  });

  it('the pipeline placeholder is gone and its README names the real workflow', () => {
    expect(existsSync(join(ROOT, 'pipeline', 'run.py'))).toBe(false);
    const doc = read('pipeline/README.md');
    expect(doc).not.toMatch(/Skeleton only/);
    expect(doc).not.toMatch(/workflows\/pipeline\.yml/);
    expect(doc).toMatch(/data-pipeline\.yml/);
  });

  it('supabase/README lists every Edge Function', () => {
    const doc = read('supabase/README.md');
    for (const fn of ['delete-account', 'send-notifications', 'revenuecat-webhook']) {
      expect(doc).toContain(`\`${fn}\``);
    }
  });

  it('no doc describes an expo-router app/ directory', () => {
    expect(read('CONTRIBUTING.md')).not.toMatch(/expo-router/);
    expect(existsSync(join(ROOT, 'app'))).toBe(false);
  });

  it('ECONOMY promises no depth tiers and quotes pack prices in SEK', () => {
    const doc = read('docs/ECONOMY.md');
    expect(doc).not.toMatch(/all depth tiers unlocked immediately/);
    expect(doc).not.toMatch(/\| \$2\.99 \|/);
    expect(doc).not.toMatch(/\| \$19\.99 \|/);
  });
});
