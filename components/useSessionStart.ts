import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AnalyticsEvent, AnalyticsEventProps } from '../lib/analytics';
import { hasConsent, type ConsentState } from '../lib/consent';

// `session_start` (T-035, fixed in T-270 · review B-06). Day-7 return, the onboarding funnel and
// every retention dashboard (docs/launch/DASHBOARDS.md) are defined on it, yet it was sent once on
// the first render, while consent still held the all-off default, so the consent gate always
// dropped it. Now it is sent when the stored consent has loaded and allows analytics, and again
// when the app returns to the foreground after more than SESSION_GAP_MS since the last one.

export const SESSION_GAP_MS = 30 * 60_000;

type Track = <E extends AnalyticsEvent>(event: E, props: AnalyticsEventProps[E]) => void;

export function useSessionStart(
  track: Track,
  consent: ConsentState,
  consentLoaded: boolean,
  now: () => number = Date.now,
): void {
  const last = useRef<number | null>(null);
  const allowed = useRef(false);
  const isAllowed = consentLoaded && hasConsent(consent, 'analytics');
  useEffect(() => {
    allowed.current = isAllowed;
  }, [isAllowed]);

  const start = useCallback(() => {
    if (!allowed.current) return;
    const t = now();
    if (last.current !== null && t - last.current <= SESSION_GAP_MS) return;
    last.current = t;
    track('session_start', {});
  }, [track, now]);

  useEffect(() => {
    if (isAllowed) start();
  }, [isAllowed, start]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
    });
    return () => sub.remove();
  }, [start]);
}
