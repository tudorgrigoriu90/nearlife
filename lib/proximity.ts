// Proximity gating (T-068 core · USER-FLOWS §6). Catching is enabled only when the user is within
// range of a catch spot. This module is the pure geo core: great-circle distance and the state
// the map/CTA renders (in-range / too-far / no-spots / gps-off). The screen (T-067/T-068) supplies
// the user location + nearby spots and reacts to the returned state. Kept render-free + testable.

export interface LatLng {
  latitude: number;
  longitude: number;
}

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

export interface NearestSpot {
  spot: LatLng;
  distanceM: number;
}

/** The closest spot to `user`, or null if there are none. */
export function nearestSpot(user: LatLng, spots: LatLng[]): NearestSpot | null {
  let best: NearestSpot | null = null;
  for (const spot of spots) {
    const distanceM = haversineMeters(user, spot);
    if (best === null || distanceM < best.distanceM) best = { spot, distanceM };
  }
  return best;
}

export type ProximityState = 'in-range' | 'too-far' | 'no-spots' | 'gps-off';

/**
 * The catch-availability state. `null` user location → gps-off; no spots → no-spots; nearest spot
 * within `rangeM` → in-range; otherwise too-far.
 */
export function proximityState(
  user: LatLng | null,
  spots: LatLng[],
  rangeM: number = DEFAULT_CATCH_RANGE_M,
): ProximityState {
  if (user === null) return 'gps-off';
  const nearest = nearestSpot(user, spots);
  if (nearest === null) return 'no-spots';
  return nearest.distanceM <= rangeM ? 'in-range' : 'too-far';
}
