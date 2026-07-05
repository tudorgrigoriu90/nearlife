// Hometown resolution (T-023). Derives a home REGION from a one-time device location and — this
// is the privacy-critical part — returns only the region, never the coordinates (PRIVACY §1:
// derive once, discard coordinates, store region only). The Kronoberg prototype hardcodes the
// resolve to Kronoberg regardless of input; production reverse-geocodes to a region and keeps
// runtime location at H3-cell resolution (T-090 / T-091). Hometown is locked once set.

export interface Region {
  id: string;
  name: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const KRONOBERG_REGION: Region = { id: 'kronoberg', name: 'Kronoberg' };

/**
 * Resolve a device location to a home region. Coordinates are consumed here and never returned
 * or persisted — only the `Region` leaves this function. Prototype: always Kronoberg (T-023).
 */
export function resolveHometown(_coords?: Coordinates): Region {
  return KRONOBERG_REGION;
}
