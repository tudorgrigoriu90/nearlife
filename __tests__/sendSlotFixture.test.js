/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync } = require('fs');
const { join } = require('path');
const { allowedHours, preferredHour } = require('../lib/sendSlot');

// T-316 · review B-51: public.push_slot_hour (SQL) must give every user the same hour as
// preferredHour (TS). The shared fixture pins both: this test against the TS, and
// pipeline/tests/test_push_due_users_pg.py against the SQL.

const FIXTURE = JSON.parse(
  readFileSync(join(__dirname, '..', 'pipeline', 'tests', 'fixtures', 'send_slots.json'), 'utf8'),
);

describe('send slot fixture', () => {
  it('the allowed hours are the cadence window', () => {
    expect(FIXTURE.allowedHours).toEqual(allowedHours());
  });

  it('every pinned user id has the hour preferredHour gives it', () => {
    const ids = Object.keys(FIXTURE.slots);
    expect(ids.length).toBeGreaterThanOrEqual(40);
    for (const id of ids) expect(preferredHour(id)).toBe(FIXTURE.slots[id]);
  });
});
