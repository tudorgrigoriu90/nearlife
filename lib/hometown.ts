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

// The id is the GADM GID the `regions` / `species_presence` tables key on, because the server
// reads it from `profiles.home_region` to pick the user's notifications (T-201).
export const KRONOBERG_REGION: Region = { id: 'SWE.9_1', name: 'Kronoberg' };

/**
 * Resolve a device location to a home region. Coordinates are consumed here and never returned
 * or persisted — only the `Region` leaves this function. Prototype: always Kronoberg (T-023).
 */
export function resolveHometown(_coords?: Coordinates): Region {
  return KRONOBERG_REGION;
}
