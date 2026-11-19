/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync, existsSync, readdirSync } = require('fs');
const { join } = require('path');
const { blocking, staleAccepts } = require('../scripts/auditGate');

// T-289 · review I-16: what CI checks beyond lint, types and tests.

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function report(...advisories) {
  const vulnerabilities = {};
  for (const [pkg, severity, url] of advisories) {
    vulnerabilities[pkg] ??= { via: [] };
    vulnerabilities[pkg].via.push({ severity, url, title: `${pkg} issue` });
  }
  return { vulnerabilities };
}

describe('audit gate', () => {
  const A = 'https://github.com/advisories/GHSA-aaaa-aaaa-aaaa';
  const B = 'https://github.com/advisories/GHSA-bbbb-bbbb-bbbb';

  it('blocks a high or critical advisory nobody accepted', () => {
    const r = report(['x', 'high', A], ['y', 'critical', B]);
    expect(blocking(r, []).map((b) => b.id)).toEqual(['GHSA-aaaa-aaaa-aaaa', 'GHSA-bbbb-bbbb-bbbb']);
  });

  it('lets moderate and low through', () => {
    expect(blocking(report(['x', 'moderate', A], ['y', 'low', B]), [])).toEqual([]);
  });

  it('lets an accepted advisory through only with a reason', () => {
    const r = report(['x', 'high', A]);
    expect(blocking(r, [{ id: 'GHSA-aaaa-aaaa-aaaa', reason: 'build-time only' }])).toEqual([]);
    expect(blocking(r, [{ id: 'GHSA-aaaa-aaaa-aaaa', reason: '' }])).toHaveLength(1);
  });

  it('names accepts that no longer match, so the list only shrinks', () => {
    const r = report(['x', 'high', A]);
    const accepted = [
      { id: 'GHSA-aaaa-aaaa-aaaa', reason: 'r' },
      { id: 'GHSA-bbbb-bbbb-bbbb', reason: 'r' },
    ];
    expect(staleAccepts(r, accepted)).toEqual(['GHSA-bbbb-bbbb-bbbb']);
  });

  it('every committed accept has a reason', () => {
    const accepted = JSON.parse(read('audit-accepted.json'));
    expect(accepted.length).toBeGreaterThan(0);
    for (const a of accepted) {
      expect(a.id).toMatch(/^GHSA-/);
      expect(a.reason.length).toBeGreaterThan(20);
    }
  });
});

describe('CI workflow', () => {
  const ci = read('.github/workflows/ci.yml');

  it('builds the Android bundle', () => {
    expect(ci).toMatch(/expo export --platform android/);
  });

  it('runs the dependency audit gate', () => {
    expect(ci).toMatch(/node scripts\/auditGate\.js/);
  });

  it('allows no lint warnings', () => {
    expect(JSON.parse(read('package.json')).scripts.lint).toMatch(/--max-warnings 0/);
  });

  it('Dependabot watches npm, pip and GitHub Actions', () => {
    expect(existsSync(join(ROOT, '.github', 'dependabot.yml'))).toBe(true);
    const deps = read('.github/dependabot.yml');
    for (const eco of ['npm', 'pip', 'github-actions']) {
      expect(deps).toMatch(new RegExp(`package-ecosystem: "?${eco}"?`));
    }
  });
});

// T-303 · review B-69: deploys wait for the checks; workflow tokens get only what they need.
describe('workflow hygiene', () => {
  const dir = join(ROOT, '.github', 'workflows');
  const workflows = readdirSync(dir).filter((f) => f.endsWith('.yml'));

  it.each(workflows)('%s declares its token permissions', (file) => {
    expect(readFileSync(join(dir, file), 'utf8')).toMatch(/^permissions:\n {2}contents: (read|write)/m);
  });

  it('Edge Functions deploy only after the checks pass', () => {
    const deploy = read('.github/workflows/deploy-functions.yml');
    expect(deploy).toMatch(/npm run verify:ci/);
    expect(deploy).toMatch(/needs: verify/);
  });

  it('the Supabase CLI version is pinned', () => {
    const deploy = read('.github/workflows/deploy-functions.yml');
    expect(deploy).not.toMatch(/version: latest/);
    expect(deploy).toMatch(/version: \d+\.\d+\.\d+/);
  });
});

// T-324 · review I-34: spring and summer observations reach GBIF months late, so a February-only
// refresh left new species out for a year. A second run in late August catches them before autumn
// migration. Both are plain `schedule` events, so every schedule-gated step and the load guard
// (gbif/load_guard.py, unconditional in supabase_load) apply to each alike.
describe('generated database types (T-335 · review I-03)', () => {
  it('the migrate workflow fails when lib/database.types.ts no longer matches the schema', () => {
    const migrate = read('.github/workflows/db-migrate.yml');
    expect(migrate).toMatch(/supabase gen types typescript --project-id/);
    expect(migrate).toMatch(/diff -u -w -B lib\/database\.types\.ts/);
  });

  it('the app has one client, typed with the generated schema, and no client casts', () => {
    expect(read('lib/supabase.ts')).toMatch(/createClient<Database>\(/);
    const app = read('App.tsx');
    expect(app).not.toMatch(/getSupabase\(\) as unknown as/);
    expect(app).not.toMatch(/createClient\(/);
  });
});

describe('data pipeline schedule', () => {
  const pipeline = read('.github/workflows/data-pipeline.yml');
  const crons = [...pipeline.matchAll(/- cron: "([^"]+)"/g)].map((m) => m[1].split(' '));

  it('refreshes twice a year: February and late August', () => {
    expect(crons.map((c) => c[3]).sort()).toEqual(['2', '8']);
    const august = crons.find((c) => c[3] === '8');
    expect(Number(august[2])).toBeGreaterThanOrEqual(15);
  });

  it('no step tells the two scheduled runs apart', () => {
    expect(pipeline).not.toMatch(/github\.event\.schedule/);
  });

  it('the species load always goes through the load guard', () => {
    expect(read('pipeline/gbif/supabase_load.py')).toMatch(/check_load_sanity\(/);
  });
});
