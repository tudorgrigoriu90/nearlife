import { InMemoryTracker } from './analytics';
import { DEFAULT_CADENCE } from './cadence';
import { allowedHours, preferredHour } from './sendSlot';
import {
  decideNotification,
  DEFAULT_PREFS,
  recordDelivery,
  type DueUser,
  type EngineDecision,
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

describe('recordDelivery', () => {
  it('emits notification_delivered for a send', () => {
    const tracker = new InMemoryTracker();
    recordDelivery(tracker, { send: true, speciesId: 'robin', occurrences: 500, deliveredAtMs: 1 });
    expect(tracker.ofType('notification_delivered')).toEqual([
      { event: 'notification_delivered', props: { speciesId: 'robin' } },
    ]);
  });

  it('stays silent on a skipped cycle', () => {
    const tracker = new InMemoryTracker();
    const skip: EngineDecision = { send: false, reason: 'quiet-hours' };
    recordDelivery(tracker, skip);
    expect(tracker.events).toEqual([]);
  });
});

// T-186: the engine now respects a per-user send slot, so a single cron cycle no longer notifies
// every user at once.
describe('per-user send slot', () => {
  const base: DueUser = {
    presence: [{ speciesId: 'great-tit', activeMonths: [1], occurrences: 1000 }],
    collectedIds: new Set<string>(),
    history: { lastSentMs: null, sentTodayCount: 0 },
    prefs: DEFAULT_PREFS,
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
