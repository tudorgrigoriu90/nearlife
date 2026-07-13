import { InMemoryTracker } from './analytics';
import { DEFAULT_CADENCE } from './cadence';
import {
  decideNotification,
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
