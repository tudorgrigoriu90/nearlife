// Cell-level location (T-091 core · PRIVACY §1). Runtime location is reduced to a coarse cell
// key so no precise lat/long trail is ever retained — only the cell is used and stored. Production
// uses H3 at res 7–8 (TSD §3, T-043); this is a lightweight, dependency-free equivalent that
// snaps coordinates to a grid at a configurable resolution, enough to bucket a user to an area
// without keeping a precise point. Pure so the storage rule is one tested place.

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Grid resolution in degrees (~2 km of latitude). Config, matching the H3 res lever (T-065). */
export const DEFAULT_CELL_RESOLUTION_DEG = 0.02;

/**
 * Snap coordinates to a coarse grid cell key. Two nearby points share a key; the precise
 * position is discarded. Not reversible to the original coordinates beyond the cell.
 */
export function cellKey(
  coords: Coordinates,
  resolutionDeg: number = DEFAULT_CELL_RESOLUTION_DEG,
): string {
  const snap = (v: number) => Math.floor(v / resolutionDeg) * resolutionDeg;
  return `${snap(coords.latitude).toFixed(4)}:${snap(coords.longitude).toFixed(4)}`;
}
