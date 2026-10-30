import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { resolveHometown, type Coordinates, type Region } from '../lib/hometown';
import { recordOffer, travelOffer } from '../lib/travel';
import type { TravelStore } from '../lib/travelStore';

// Notices when the phone is in another county while the app is open (T-218). One coarse fix on
// launch and on returning to the foreground, at most every CHECK_EVERY_MS: no tracking, no
// background location. The fix becomes a county at once and is dropped.

const CHECK_EVERY_MS = 30 * 60_000;

export interface TravelOfferInput {
  /** Location consent given, onboarding done and a hometown set. */
  enabled: boolean;
  homeId: string | null;
  /** The county already on screen, if the user is looking around one. */
  viewingId: string | null;
  getFix: () => Promise<Coordinates | null>;
  store: TravelStore;
  onAccept?: (county: Region) => void;
}

export function useTravelOffer({ enabled, homeId, viewingId, getFix, store, onAccept }: TravelOfferInput): {
  offer: Region | null;
  accept: () => void;
  dismiss: () => void;
} {
  const [offer, setOffer] = useState<Region | null>(null);
  const lastCheck = useRef(0);

  // Returns the county to offer, if any; the effect decides whether it is still wanted.
  const check = useCallback(async (): Promise<Region | null> => {
    if (!enabled || homeId === null) return null;
    const now = Date.now();
    if (lastCheck.current !== 0 && now - lastCheck.current < CHECK_EVERY_MS) return null;
    lastCheck.current = now;
    const fix = await getFix();
    const current = fix === null ? null : resolveHometown(fix);
    return travelOffer({ current, homeId, log: await store.load(), nowMs: now, viewingId });
  }, [enabled, homeId, viewingId, getFix, store]);

  useEffect(() => {
    let live = true;
    const run = () =>
      check()
        .then((found) => {
          if (live && found) setOffer(found);
        })
        .catch(() => undefined);
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [check]);

  const close = useCallback(
    (accepted: boolean) => {
      if (offer === null) return;
      const county = offer;
      setOffer(null);
      void store.load().then((log) => store.save(recordOffer(log, county.id, Date.now())));
      if (accepted) onAccept?.(county);
    },
    [offer, store, onAccept],
  );

  return { offer, accept: () => close(true), dismiss: () => close(false) };
}
