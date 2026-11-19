import { DEFAULT_CADENCE } from './cadence';
import { allowedHours, preferredHour } from './sendSlot';
import {
  decideNotification,
  type DueUser,
} from './notificationEngine';
import type { RegionPresence } from './speciesRepository';

const active: RegionPresence = { speciesId: 'robin', activeMonths: [6], occurrences: 500 };

// A user who is eligible to be sent to: notifications on, no quiet hours, no prior send.
function eligibleUser(overrides: Partial<DueUser> = {}): DueUser {
  return {
    presence: [active],
    collectedIds: new Set(),
    history: { lastSentMs: null, sentTodayCount: 0 },
    prefs: { enabled: true },
    localHour: 12,
    month: 6,
    nowMs: 1_000_000_000_000,
    ...overrides,
  };
}

describe('decideNotification', () => {
  it('sends the selected species when everything is clear', () => {
    const d = decideNotification(eligibleUser(), { rng: () => 0 });
    expect(d).toEqual({ send: true, speciesId: 'robin', occurrences: 500, deliveredAtMs: 1_000_000_000_000 });
  });

  it('never sends when notifications are off', () => {
    const d = decideNotification(eligibleUser({ prefs: { enabled: false } }), { rng: () => 0 });
    expect(d).toEqual({ send: false, reason: 'notifications-off' });
  });

  it('respects quiet hours before doing candidate work', () => {
    const d = decideNotification(eligibleUser({ localHour: DEFAULT_CADENCE.quietStartHour }), { rng: () => 0 });
    expect(d).toEqual({ send: false, reason: 'quiet-hours' });
  });

  it('respects the daily cap', () => {
    const d = decideNotification(
      eligibleUser({ history: { lastSentMs: null, sentTodayCount: DEFAULT_CADENCE.maxPerDay } }),
      { rng: () => 0 },
    );
    expect(d).toEqual({ send: false, reason: 'daily-cap' });
  });

  it('reports no-candidate when nothing is active and uncollected', () => {
    const d = decideNotification(eligibleUser({ collectedIds: new Set(['robin']) }), { rng: () => 0 });
    expect(d).toEqual({ send: false, reason: 'no-candidate' });
  });
});


// T-186: the engine now respects a per-user send slot, so a single cron cycle no longer notifies
// every user at once.
describe('per-user send slot', () => {
  const base: DueUser = {
    presence: [{ speciesId: 'great-tit', activeMonths: [1], occurrences: 1000 }],
    collectedIds: new Set<string>(),
    history: { lastSentMs: null, sentTodayCount: 0 },
    prefs: { enabled: true },
    localHour: 12,
    month: 1,
    nowMs: 0,
    userId: 'user-a',
  };

  it('does not send before the user reaches their slot', () => {
    const slot = preferredHour('user-a');
    const before = allowedHours().filter((h) => h < slot);
    if (before.length === 0) return; // this id drew the first slot; nothing earlier to test
    const d = decideNotification({ ...base, localHour: before[0] });
    expect(d).toEqual({ send: false, reason: 'before-slot' });
  });

  it('sends once the slot has arrived', () => {
    const d = decideNotification({ ...base, localHour: preferredHour('user-a') }, { rng: () => 0 });
    expect(d.send).toBe(true);
  });

  it('two users with different slots are not notified in the same hour', () => {
    // The whole point: one cron cycle must not fan out to everyone at once.
    const ids = Array.from({ length: 200 }, (_, i) => `u${i}`);
    const hours = new Set(ids.map((id) => preferredHour(id)));
    expect(hours.size).toBeGreaterThan(1);
  });

  it('still honours quiet hours ahead of the slot', () => {
    const d = decideNotification({ ...base, localHour: 23 });
    expect(d).toEqual({ send: false, reason: 'quiet-hours' });
  });

  it('a user with no id is not slot-gated, so the engine stays usable without one', () => {
    const { userId: _omitted, ...noId } = base;
    const d = decideNotification({ ...noId, localHour: 9 } as DueUser, { rng: () => 0 });
    expect(d.send).toBe(true);
  });
});

// T-341 · review F-03: each notification choice changes the decision; the defaults change nothing.
describe('notification choices in the decision', () => {
  const HOUR = 3_600_000;
  const now = 1_000_000_000_000;

  it('frequency: every other day waits 44 hours, weekly 164', () => {
    const sentHoursAgo = (h: number, frequency: 'daily' | 'everyOtherDay' | 'weekly') =>
      decideNotification(
        eligibleUser({
          history: { lastSentMs: now - h * HOUR, sentTodayCount: 0 },
          prefs: { enabled: true, choices: { frequency, window: null, groups: null } },
        }),
        { rng: () => 0 },
      );
    expect(sentHoursAgo(30, 'daily').send).toBe(true);
    expect(sentHoursAgo(30, 'everyOtherDay')).toEqual({ send: false, reason: 'frequency-cap' });
    expect(sentHoursAgo(45, 'everyOtherDay').send).toBe(true);
    expect(sentHoursAgo(100, 'weekly')).toEqual({ send: false, reason: 'frequency-cap' });
    expect(sentHoursAgo(165, 'weekly').send).toBe(true);
  });

  it('window: only within the chosen hours, from the user’s slot inside them', () => {
    const at = (localHour: number) =>
      decideNotification(
        eligibleUser({
          localHour,
          userId: 'user-a',
          prefs: { enabled: true, choices: { frequency: 'daily', window: 'morning', groups: null } },
        }),
        { rng: () => 0 },
      );
    expect(at(12)).toEqual({ send: false, reason: 'before-slot' }); // outside the morning window
    expect(at(10).send).toBe(true); // the window's last hour is at or after any slot in it
  });

  it('groups: only species of the chosen groups', () => {
    const presence: RegionPresence[] = [
      { speciesId: 'robin', activeMonths: [6], occurrences: 500, group: 'bird' },
      { speciesId: 'orchid', activeMonths: [6], occurrences: 5, group: 'plant' },
    ];
    const d = decideNotification(
      eligibleUser({ presence, prefs: { enabled: true, choices: { frequency: 'daily', window: null, groups: ['plant'] } } }),
      { rng: () => 0 },
    );
    expect(d).toMatchObject({ send: true, speciesId: 'orchid' });
    const none = decideNotification(
      eligibleUser({ presence, prefs: { enabled: true, choices: { frequency: 'daily', window: null, groups: ['mammal'] } } }),
      { rng: () => 0 },
    );
    expect(none).toEqual({ send: false, reason: 'no-candidate' });
  });
});
