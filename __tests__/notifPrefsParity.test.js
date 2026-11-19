/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync } = require('fs');
const { join } = require('path');

// T-341 · review F-03: the window hours, gaps and allowed values exist twice, in the app's tested
// TypeScript (lib/notifPrefs.ts) and in the SQL that picks who is due (migration 0046). This keeps
// them equal, the way the send-slot fixture keeps the slot hash equal.

const ROOT = join(__dirname, '..');
const ts = readFileSync(join(ROOT, 'lib', 'notifPrefs.ts'), 'utf8');
const sql = readFileSync(join(ROOT, 'supabase', 'migrations', '20261119000009_notif_prefs.sql'), 'utf8');

const list = (s) => s.split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean);

describe('notification choices: SQL and TypeScript agree', () => {
  it('on each window’s hours', () => {
    for (const w of ['morning', 'midday', 'evening']) {
      const inTs = list(new RegExp(`${w}: \\[([^\\]]*)\\]`).exec(ts)[1]).map(Number);
      const inSql = list(new RegExp(`when '${w}' +then array[\\s\\S]*?'\\{([^}]*)\\}'`).exec(sql)[1]).map(Number);
      expect(inSql).toEqual(inTs);
    }
  });

  it('on the gaps between sends', () => {
    const gaps = /MIN_INTERVAL_HOURS[^{]*\{([^}]*)\}/.exec(ts)[1];
    for (const f of ['everyOtherDay', 'weekly']) {
      const inTs = Number(new RegExp(`${f}: (\\d+)`).exec(gaps)[1]);
      expect(sql).toMatch(new RegExp(`when '${f}' then ${inTs}\\b`));
    }
  });

  it('on the allowed frequencies, windows and groups', () => {
    for (const name of ['FREQUENCIES', 'SEND_WINDOWS', 'PREF_GROUPS']) {
      for (const v of list(new RegExp(`${name} = \\[([^\\]]*)\\]`).exec(ts)[1])) expect(sql).toContain(`'${v}'`);
    }
  });
});
