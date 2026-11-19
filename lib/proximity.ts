// Proximity gating (T-068 core · USER-FLOWS §6). Catching is enabled only when the user is within
// range of a catch spot. This module is the pure geo core: great-circle distance and the state
// the map/CTA renders (in-range / too-far / no-spots / gps-off). The screen (T-067/T-068) supplies
// the user location + nearby spots and reacts to the returned state. Kept render-free + testable.

export interface LatLng {
  latitude: number;
  longitude: number;
  /** The fix's reported accuracy radius in metres, when known (T-284). */
  accuracyM?: number;
}

/** The most a fix's inaccuracy may count in the user's favour (T-284 · review B-25). */
export const MAX_ACCURACY_ALLOWANCE_M = 50;

/** Enable catching within this many metres of a spot (config, TSD §5). */
export const DEFAULT_CATCH_RANGE_M = 100;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in metres (haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Catch availability, as `catchSpotView` (catchSpots.ts) reports it. */
export type ProximityState = 'in-range' | 'too-far' | 'no-spots' | 'gps-off';
