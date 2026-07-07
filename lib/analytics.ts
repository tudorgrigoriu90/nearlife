// Analytics event catalog + tracker seam (T-132). A typed event vocabulary and a `Tracker`
// interface so the app emits events against a stable contract, and the PostHog-backed tracker
// (T-035, blocked on the PostHog account) drops in as a straight implementation — exactly the
// pattern the collection store uses (T-116). Events are the ones the validation funnel needs
// (T-035/T-037, VALIDATION-CRITERIA.md). Kept storage-free so it is unit-testable and carries no
// PII — payloads are species ids and enums, never location or identity (PRIVACY §2).

/** Event → payload shape. Adding an event here makes its props type-checked at every call site. */
export interface AnalyticsEventProps {
  session_start: Record<string, never>;
  this_week_opened: Record<string, never>;
  notification_delivered: { speciesId: string };
  notification_opened: { speciesId: string };
  species_spotted: { speciesId: string; source: 'notification' | 'this_week' | 'onboarding' };
  catch_attempted: { speciesId: string };
  catch_succeeded: { speciesId: string; grade: 'perfect' | 'good' };
  free_catches_exhausted: Record<string, never>;
  paywall_shown: Record<string, never>;
}

export type AnalyticsEvent = keyof AnalyticsEventProps;

export interface TrackedEvent<E extends AnalyticsEvent = AnalyticsEvent> {
  event: E;
  props: AnalyticsEventProps[E];
}

export interface Tracker {
  track<E extends AnalyticsEvent>(event: E, props: AnalyticsEventProps[E]): void;
}

/** Default until PostHog is wired (T-035): swallow events so calls are safe from day one. */
export class NoopTracker implements Tracker {
  track<E extends AnalyticsEvent>(_event: E, _props: AnalyticsEventProps[E]): void {
    /* no-op */
  }
}

/** Records events in memory — for tests and local funnel inspection before PostHog lands. */
export class InMemoryTracker implements Tracker {
  readonly events: TrackedEvent[] = [];

  track<E extends AnalyticsEvent>(event: E, props: AnalyticsEventProps[E]): void {
    this.events.push({ event, props } as TrackedEvent);
  }

  /** All recorded events of one type — convenience for funnel assertions. */
  ofType<E extends AnalyticsEvent>(event: E): TrackedEvent<E>[] {
    return this.events.filter((e) => e.event === event) as TrackedEvent<E>[];
  }
}

/**
 * Wraps a tracker so events are only forwarded when the user has consented to analytics
 * (T-088 gating). `hasConsent` is read at each `track` call, so revoking consent takes effect
 * immediately. This is how the PostHog-backed tracker (T-035) honours the analytics opt-in.
 */
export class ConsentGatedTracker implements Tracker {
  constructor(
    private readonly delegate: Tracker,
    private readonly hasConsent: () => boolean,
  ) {}

  track<E extends AnalyticsEvent>(event: E, props: AnalyticsEventProps[E]): void {
    if (this.hasConsent()) this.delegate.track(event, props);
  }
}

const DAY_MS = 86_400_000;

/**
 * The retention day-index of an event relative to first-seen (D0 = first day, D1 = next day …).
 * The day-1/3/7 retention buckets the validation criteria need are derived from this
 * (VALIDATION-CRITERIA.md). Events before first-seen clamp to 0.
 */
export function retentionDayIndex(firstSeenMs: number, eventMs: number): number {
  return Math.max(0, Math.floor((eventMs - firstSeenMs) / DAY_MS));
}
