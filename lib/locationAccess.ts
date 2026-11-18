import type { Coordinates } from './hometown';

// Location access that follows the user's choice (T-272 · review B-08, B-09). The Settings switch
// is the consent; the OS permission is the means. Every location read in the app goes through
// `fixIfConsented`, so turning the switch off stops them all, and the permission request tells a
// "no" the user can still change from one only the system settings can lift.

export type LocationAccess = 'granted' | 'denied' | 'blocked';

export function locationOutcome(answer: { status: string; canAskAgain: boolean }): LocationAccess {
  if (answer.status === 'granted') return 'granted';
  return answer.canAskAgain ? 'denied' : 'blocked';
}

/** A fix reader that returns null without touching the GPS while consent is off. */
export function fixIfConsented(
  consented: () => boolean,
  getFix: () => Promise<Coordinates | null>,
): () => Promise<Coordinates | null> {
  return () => (consented() ? getFix() : Promise.resolve(null));
}
