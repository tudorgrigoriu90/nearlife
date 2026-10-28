import type { CountyShape } from './geo/countyShape';
import { SWEDISH_COUNTY_SHAPES } from './geo/swedishCounties';

// Hometown resolution (T-023 → T-090). Derives a home REGION from a one-time device location and —
// this is the privacy-critical part — returns only the region, never the coordinates (PRIVACY §1:
// derive once, discard coordinates, store region only). The lookup runs on the phone against
// bundled county outlines, so the location never leaves the device; a reverse-geocoding API would
// have sent it to a third party. Hometown is locked once set (lib/hometownStore.ts).

export interface Region {
  /** GADM GID — the key of `regions` / `species_presence`, e.g. 'SWE.9_1'. */
  id: string;
  name: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const KRONOBERG_REGION: Region = { id: 'SWE.9_1', name: 'Kronoberg' };

/**
 * How far off every outline a point may be and still get the nearest county. The outlines are
 * 1:10m Natural Earth and drop small islands, so an outer island falls just outside them. Measured
 * on 2026-10-28: 10 km still lost Landsort and Sandskär; 20 km pulled Kastrup and Dragør (Denmark)
 * into Skåne; 15 km keeps every Swedish island tried and every Danish point out. Border towns that
 * touch Sweden (Tornio, Helsingør) still resolve to the Swedish side at any limit — acceptable,
 * their species are the same.
 */
export const NEAREST_COUNTY_MAX_KM = 15;

type Point = [number, number]; // [lng, lat]

/** Ray casting on [lng, lat]. Fine at county scale; no county straddles the antimeridian. */
function inRing([x, y]: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance in km from a point to a ring's edges, on a local equirectangular projection. */
function kmToRing([lng, lat]: Point, ring: Point[]): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (let i = 1; i < ring.length; i += 1) {
    const ax = (ring[i - 1][0] - lng) * kx;
    const ay = (ring[i - 1][1] - lat) * ky;
    const bx = (ring[i][0] - lng) * kx;
    const by = (ring[i][1] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/**
 * Resolve a device location to its home county, or null outside Sweden (v1 is Sweden only).
 * Coordinates are consumed here and never returned or persisted — only the `Region` leaves.
 */
export function resolveHometown(
  coords: Coordinates,
  shapes: CountyShape[] = SWEDISH_COUNTY_SHAPES,
): Region | null {
  const point: Point = [coords.longitude, coords.latitude];
  for (const shape of shapes) {
    if (shape.polygons.some((ring) => inRing(point, ring))) return { id: shape.id, name: shape.name };
  }
  let nearest: CountyShape | null = null;
  let nearestKm = Infinity;
  for (const shape of shapes) {
    for (const ring of shape.polygons) {
      const km = kmToRing(point, ring);
      if (km < nearestKm) {
        nearestKm = km;
        nearest = shape;
      }
    }
  }
  return nearest !== null && nearestKm <= NEAREST_COUNTY_MAX_KM
    ? { id: nearest.id, name: nearest.name }
    : null;
}
