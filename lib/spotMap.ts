import { haversineMeters, type LatLng } from './proximity';
import type { CatchSpot } from './catchSpots';

// Data for the catch-spot map (T-067). Pure; the map component itself is components/SpotMap.tsx.

/**
 * OpenFreeMap: free vector tiles built from OpenStreetMap, no account or key, so invariant #7 holds
 * at $0. Its style carries the "© OpenStreetMap contributors" attribution (T-008).
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** The spots worth drawing: the nearest `limit`, so a big county does not ship thousands of points. */
export function nearbySpots(user: LatLng | null, spots: CatchSpot[], limit = 150): CatchSpot[] {
  if (user === null) return spots.slice(0, limit);
  return spots
    .map((spot) => ({ spot, d: haversineMeters(user, { latitude: spot.lat, longitude: spot.lon }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.spot);
}

export interface SpotFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { id: string; target: boolean };
}

export function spotsGeoJson(
  spots: CatchSpot[],
  targetId: string | null,
): { type: 'FeatureCollection'; features: SpotFeature[] } {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => ({
      type: 'Feature',
      id: spot.id,
      geometry: { type: 'Point', coordinates: [spot.lon, spot.lat] },
      properties: { id: spot.id, target: spot.id === targetId },
    })),
  };
}
