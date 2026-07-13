import type { AnalyticsEvent, AnalyticsEventProps, Tracker } from './analytics';

// PostHog-backed tracker (T-035). Consent gating happens one layer up (`ConsentGatedTracker`
// wraps this) — this class only translates the typed event catalog into `client.capture()` calls,
// kept thin like the other gateways (`SpeciesGateway`, `CollectionGateway`) so it stays swappable
// and testable without the real SDK (network + native modules).

/** Minimal shape this tracker needs from the SDK client — the real client satisfies it as-is. */
export interface PostHogClientLike {
  capture(event: string, properties?: Record<string, unknown>): void;
}

export class PostHogTracker implements Tracker {
  constructor(private readonly client: PostHogClientLike) {}

  track<E extends AnalyticsEvent>(event: E, props: AnalyticsEventProps[E]): void {
    this.client.capture(event, props);
  }
}
