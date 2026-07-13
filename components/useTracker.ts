import { useCallback, useEffect, useRef } from 'react';
import type { AnalyticsEvent, AnalyticsEventProps, Tracker } from '../lib/analytics';
import { ConsentGatedTracker, NoopTracker } from '../lib/analytics';
import { hasConsent, type ConsentState } from '../lib/consent';
import { getPostHogClient } from '../lib/posthog';
import { hasPostHogConfig } from '../lib/posthogConfig';
import { PostHogTracker } from '../lib/posthogTracker';

// React glue for analytics (T-035). Mirrors useCollection's lazy off-render construction: the
// tracker is built once — PostHog-backed when configured, else a no-op so the app still runs
// without a PostHog account — and wrapped in `ConsentGatedTracker` so no event ever reaches
// PostHog before the user grants analytics consent (invariant #6, PRIVACY-COMPLIANCE §2).
// `consent` is read through a ref so the gate always sees the latest value without rebuilding the
// tracker (and its PostHog client) on every consent toggle. Returns a stable `track` function,
// never the tracker object itself, so nothing is invoked during render (only from effects/handlers).

function createDelegate(): Tracker {
  return hasPostHogConfig() ? new PostHogTracker(getPostHogClient()) : new NoopTracker();
}

export function useTracker(consent: ConsentState): Tracker['track'] {
  const consentRef = useRef(consent);
  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);

  const trackerRef = useRef<Tracker | null>(null);
  const getTracker = useCallback((): Tracker => {
    trackerRef.current ??= new ConsentGatedTracker(createDelegate(), () =>
      hasConsent(consentRef.current, 'analytics'),
    );
    return trackerRef.current;
  }, []);

  return useCallback(
    <E extends AnalyticsEvent>(event: E, props: AnalyticsEventProps[E]) => {
      getTracker().track(event, props);
    },
    [getTracker],
  );
}
