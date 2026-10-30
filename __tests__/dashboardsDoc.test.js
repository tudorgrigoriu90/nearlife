/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync } = require('fs');
const { join } = require('path');

// T-037/T-099: the dashboard guide may only name events the app actually sends. A renamed or
// removed event fails here instead of leaving a PostHog insight that silently counts zero.

const DOC = readFileSync(join(__dirname, '..', 'docs', 'launch', 'DASHBOARDS.md'), 'utf8');
const ANALYTICS = readFileSync(join(__dirname, '..', 'lib', 'analytics.ts'), 'utf8');

function sentEvents() {
  const block = ANALYTICS.slice(ANALYTICS.indexOf('interface AnalyticsEventProps'));
  const body = block.slice(0, block.indexOf('\n}'));
  return new Set([...body.matchAll(/^\s+([a-z_]+):/gm)].map((m) => m[1]));
}

function eventsUsed() {
  return [...DOC.matchAll(/\*\*Events used:\*\*([^\n]*(?:\n(?!\n)[^\n]*)*)/g)].flatMap((m) =>
    [...m[1].matchAll(/`([a-z_]+)`/g)].map((e) => e[1]),
  );
}

describe('docs/launch/DASHBOARDS.md', () => {
  it('lists the events each dashboard uses', () => {
    expect(eventsUsed().length).toBeGreaterThan(0);
  });

  it('names only events the app sends', () => {
    const sent = sentEvents();
    expect(sent.size).toBeGreaterThan(5);
    expect(eventsUsed().filter((e) => !sent.has(e))).toEqual([]);
  });

  it('every event named in a table is also listed under "Events used"', () => {
    const listed = new Set(eventsUsed());
    const inTables = [...DOC.matchAll(/^\|.*$/gm)].flatMap((row) =>
      [...row[0].matchAll(/`([a-z]+_[a-z_]+)`/g)].map((e) => e[1]),
    );
    // Product ids, source values and table names also appear in backticks; they are not events.
    const notEvents = new Set(['full_game', 'all_regions', 'notification_log', 'catch_spot', 'this_week']);
    expect(inTables.filter((e) => !listed.has(e) && !notEvents.has(e))).toEqual([]);
  });
});
