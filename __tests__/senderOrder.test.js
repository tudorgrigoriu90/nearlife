/* global describe, it, expect, __dirname */
const { readFileSync } = require('fs');
const { join } = require('path');

// T-282 · review B-23: the sender pages through every table 1,000 rows at a time. Without a total
// order PostgREST may repeat or skip rows across pages, so each paged read must be ordered.
const SRC = readFileSync(
  join(__dirname, '..', 'supabase', 'functions', 'send-notifications', 'index.ts'),
  'utf8',
);

describe('send-notifications paged reads', () => {
  it('every readAll builder orders before it pages', () => {
    // Call sites only: skip the function's own definition.
    const calls = SRC.split('readAll(').slice(1).filter((c) => !c.startsWith('build:'));
    expect(calls.length).toBeGreaterThan(1);
    for (const call of calls) {
      const builder = call.slice(0, call.indexOf('.range('));
      // readIn's own readAll orders through its `order` loop.
      expect(/\.order\(/.test(builder)).toBe(true);
    }
  });

  it('every readIn call names its order keys', () => {
    const calls = SRC.split('await readIn(').slice(1);
    expect(calls.length).toBeGreaterThanOrEqual(4);
    for (const call of calls) {
      const args = call.slice(0, call.indexOf(');'));
      expect(args).toMatch(/\[\s*'[a-z_]+'/);
    }
  });
});

// T-316 · review B-51: the sender asks the database for the users due this run, instead of
// reading every opted-in user's devices, profile, collection and send log each hour.
describe('send-notifications reads only the users due', () => {
  it('uses push_due_users, and reads no table of every user', () => {
    expect(SRC).toMatch(/rpc\('push_due_users'/);
    // Writes stay (logging a send, removing a dead token); reads of these tables are gone.
    for (const table of ['push_devices', 'profiles', 'collection', 'notification_log']) {
      expect(SRC.includes(`readIn(db, '${table}'`)).toBe(false);
      expect(new RegExp(`from\\('${table}'\\)\\s*\\.select\\(`).test(SRC)).toBe(false);
    }
  });
});
