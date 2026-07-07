import { ConsentGatedTracker, InMemoryTracker, NoopTracker, retentionDayIndex } from './analytics';

describe('InMemoryTracker', () => {
  it('records events with their typed props in order', () => {
    const tracker = new InMemoryTracker();
    tracker.track('session_start', {});
    tracker.track('species_spotted', { speciesId: 'european-robin', source: 'onboarding' });
    tracker.track('species_spotted', { speciesId: 'common-swift', source: 'this_week' });

    expect(tracker.events).toHaveLength(3);
    expect(tracker.events[0]).toEqual({ event: 'session_start', props: {} });
    expect(tracker.ofType('species_spotted').map((e) => e.props.speciesId)).toEqual([
      'european-robin',
      'common-swift',
    ]);
  });

  it('supports the catch funnel events', () => {
    const tracker = new InMemoryTracker();
    tracker.track('catch_attempted', { speciesId: 'pike' });
    tracker.track('catch_succeeded', { speciesId: 'pike', grade: 'perfect' });
    tracker.track('free_catches_exhausted', {});
    tracker.track('paywall_shown', {});

    expect(tracker.ofType('catch_succeeded')[0].props.grade).toBe('perfect');
    expect(tracker.ofType('paywall_shown')).toHaveLength(1);
  });
});

describe('NoopTracker', () => {
  it('accepts events without throwing (safe default before PostHog)', () => {
    const tracker = new NoopTracker();
    expect(() => tracker.track('this_week_opened', {})).not.toThrow();
  });
});

describe('ConsentGatedTracker', () => {
  it('forwards events only while analytics consent is granted', () => {
    const inner = new InMemoryTracker();
    let consented = false;
    const tracker = new ConsentGatedTracker(inner, () => consented);

    tracker.track('session_start', {});
    expect(inner.events).toHaveLength(0); // no consent → dropped

    consented = true;
    tracker.track('session_start', {});
    tracker.track('this_week_opened', {});
    expect(inner.events).toHaveLength(2);

    consented = false; // revoking takes effect immediately
    tracker.track('paywall_shown', {});
    expect(inner.events).toHaveLength(2);
  });
});

describe('retentionDayIndex', () => {
  const first = Date.UTC(2026, 3, 1, 9, 0, 0);
  const day = 86_400_000;

  it('buckets events into D0/D1/D7 relative to first-seen', () => {
    expect(retentionDayIndex(first, first)).toBe(0);
    expect(retentionDayIndex(first, first + 20 * 3_600_000)).toBe(0); // same 24h window
    expect(retentionDayIndex(first, first + day)).toBe(1);
    expect(retentionDayIndex(first, first + 7 * day)).toBe(7);
  });

  it('clamps events before first-seen to day 0', () => {
    expect(retentionDayIndex(first, first - day)).toBe(0);
  });
});
