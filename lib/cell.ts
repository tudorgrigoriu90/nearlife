import { getResolution, latLngToCell } from 'h3-js';

// Cell-level location (T-091 · PRIVACY §1). Runtime location is reduced to a coarse **H3** cell so
// no precise lat/long trail is ever retained — only the cell is used and stored. H3 (res 7–8, TSD
// §3) is the same hexagonal index the data pipeline's per-cell presence uses (T-043/T-044), so an
// app-side location and the presence grid line up on one cell system. Pure so the storage rule
// lives in one tested place.

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Stored H3 resolution. Res 8 ≈ 0.74 km² hexagons (edge ~0.53 km) — fine enough to bucket a user to
 * a neighbourhood-sized area, coarse enough that a precise point is never recoverable (PRIVACY §1).
 * The pipeline can aggregate up the H3 hierarchy from here (res 7 is the parent) without re-keying.
 */
export const DEFAULT_CELL_RESOLUTION = 8;

/**
 * Reduce coordinates to an H3 cell index. Two nearby points share a cell; the precise position is
 * discarded and not recoverable beyond the cell. The returned index is an opaque H3 token (e.g.
 * `881f1d4897fffff`), never the coordinates themselves.
 */
export function cellKey(
  coords: Coordinates,
  resolution: number = DEFAULT_CELL_RESOLUTION,
): string {
  return latLngToCell(coords.latitude, coords.longitude, resolution);
}

/** The H3 resolution of a cell key — lets the pipeline/aggregation reason about the grid level. */
export function cellResolution(key: string): number {
  return getResolution(key);
}
