/* global __dirname */
// Dependency audit gate for CI (T-289 · review I-16).
//
// Fails on any high or critical advisory in the production dependency tree unless it is listed in
// audit-accepted.json with a reason. `npm audit --audit-level=high` alone cannot be the gate: some
// advisories sit in build tooling (Metro, glob) whose only "fix" npm offers is a downgrade of Expo
// itself, so they are accepted one by one, with the reason, instead of switching the check off.
// An accept that no longer matches anything is reported, so the list only ever shrinks.
//
//   node scripts/auditGate.js      # runs `npm audit --omit=dev --json` and applies the gate

const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

const BLOCKING = new Set(['high', 'critical']);

function advisoryId(url) {
  const m = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/.exec(url ?? '');
  return m ? m[0] : String(url);
}

/** Every advisory in an `npm audit --json` report, one entry per package and advisory. */
function advisories(report) {
  const out = [];
  for (const [pkg, vuln] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      // A string `via` names another vulnerable package; its own entry carries the advisory.
      if (typeof via !== 'object') continue;
      out.push({ pkg, id: advisoryId(via.url), severity: via.severity, title: via.title });
    }
  }
  return out;
}

/** High and critical advisories not accepted with a reason, deduplicated and sorted by id. */
function blocking(report, accepted) {
  const ok = new Set(accepted.filter((a) => a.reason && a.reason.trim()).map((a) => a.id));
  const seen = new Map();
  for (const a of advisories(report)) {
    if (BLOCKING.has(a.severity) && !ok.has(a.id) && !seen.has(a.id)) seen.set(a.id, a);
  }
  return [...seen.values()].sort((x, y) => x.id.localeCompare(y.id));
}

/** Accepted ids that the report no longer contains. */
function staleAccepts(report, accepted) {
  const present = new Set(advisories(report).map((a) => a.id));
  return accepted.map((a) => a.id).filter((id) => !present.has(id));
}

function main() {
  let raw;
  try {
    raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' });
  } catch (e) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    raw = e.stdout;
  }
  const report = JSON.parse(raw);
  const accepted = JSON.parse(
    readFileSync(path.join(__dirname, '..', 'audit-accepted.json'), 'utf8'),
  );
  const stale = staleAccepts(report, accepted);
  if (stale.length) console.log(`Accepted advisories no longer reported (remove them): ${stale.join(', ')}`);
  const blocked = blocking(report, accepted);
  for (const b of blocked) console.log(`${b.severity}: ${b.id} in ${b.pkg} — ${b.title}`);
  if (blocked.length) {
    console.log('Fix these (npm audit fix, an override) or accept each in audit-accepted.json with a reason.');
    process.exit(1);
  }
  console.log('Audit gate: no unaccepted high or critical advisories.');
}

if (require.main === module) main();

module.exports = { advisories, blocking, staleAccepts };
