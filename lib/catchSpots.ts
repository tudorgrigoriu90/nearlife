import { DEFAULT_CATCH_RANGE_M, haversineMeters, type LatLng, type ProximityState } from './proximity';
import type { SpeciesCategory } from './species/types';

// Catch spots for the app (T-068). The app downloads its county's spots, which the database only
// ever returns unflagged (T-049), and finds the nearest suitable one ON THE DEVICE: no query ever
// carries the user's position (PRIVACY §1). A spot suits a species when its habitat is one the
// species lives in (T-047), so a pike is only ever sent to water.

export type SpotHabitat = 'land' | 'freshwater' | 'coast';

export interface CatchSpot {
  id: string;
  kind: string;
  habitat: SpotHabitat;
  name: string | null;
  lat: number;
  lon: number;
}

const HABITATS = new Set<string>(['land', 'freshwater', 'coast']);

// Same defaults as pipeline/gbif/habitats.py, for species the loader has not reached yet.
const DEFAULT_BY_CATEGORY: Partial<Record<SpeciesCategory, SpotHabitat[]>> = {
  fish: ['freshwater', 'coast'],
  bird: ['land', 'freshwater', 'coast'],
};

export function habitatsFor(species: { category: SpeciesCategory; catchHabitats?: SpotHabitat[] }): SpotHabitat[] {
  if (species.catchHabitats && species.catchHabitats.length > 0) return species.catchHabitats;
  return DEFAULT_BY_CATEGORY[species.category] ?? ['land'];
}

export function nearestSpotFor(
  user: LatLng,
  spots: CatchSpot[],
  habitats: SpotHabitat[],
): { spot: CatchSpot; distanceM: number } | null {
  let best: { spot: CatchSpot; distanceM: number } | null = null;
  for (const spot of spots) {
    if (!habitats.includes(spot.habitat)) continue;
    const distanceM = haversineMeters(user, { latitude: spot.lat, longitude: spot.lon });
    if (best === null || distanceM < best.distanceM) best = { spot, distanceM };
  }
  return best;
}

export interface CatchSpotView {
  /** `unmapped`: the county has no spots loaded at all, so catching is not tied to a place there. */
  state: ProximityState | 'unmapped';
  /** The spot to go to: the nearest suitable one, or null when none suits the species. */
  spot: CatchSpot | null;
  distanceM: number | null;
}

/**
 * What the catch screen shows (T-068): the nearest spot that suits the species and whether the
 * user is close enough to catch. Without a position (GPS off, permission declined) it cannot
 * measure, so the state is gps-off.
 */
export function catchSpotView(
  user: LatLng | null,
  spots: CatchSpot[],
  habitats: SpotHabitat[],
  rangeM: number = DEFAULT_CATCH_RANGE_M,
  /** A spot the user picked on the map (T-067); ignored if it does not suit the species. */
  chosenId: string | null = null,
): CatchSpotView {
  // No spots at all means the county has not been mapped (or loaded) yet, not that it has no
  // public places. Blocking every catch there would punish the user for our data.
  if (spots.length === 0) return { state: 'unmapped', spot: null, distanceM: null };
  const suitable = spots.filter((s) => habitats.includes(s.habitat));
  if (suitable.length === 0) return { state: 'no-spots', spot: null, distanceM: null };
  if (user === null) return { state: 'gps-off', spot: null, distanceM: null };
  const chosen = suitable.find((s) => s.id === chosenId);
  const nearest = chosen
    ? { spot: chosen, distanceM: haversineMeters(user, { latitude: chosen.lat, longitude: chosen.lon }) }
    : nearestSpotFor(user, suitable, habitats)!;
  return {
    state: nearest.distanceM <= rangeM ? 'in-range' : 'too-far',
    spot: nearest.spot,
    distanceM: nearest.distanceM,
  };
}

export function parseSpots(rows: unknown): CatchSpot[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((raw) => {
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.kind !== 'string') return [];
    if (typeof r.habitat !== 'string' || !HABITATS.has(r.habitat)) return [];
    if (typeof r.lat !== 'number' || typeof r.lon !== 'number') return [];
    return [{
      id: r.id,
      kind: r.kind,
      habitat: r.habitat as SpotHabitat,
      name: typeof r.name === 'string' ? r.name : null,
      lat: r.lat,
      lon: r.lon,
    }];
  });
}

export interface CatchSpotSource {
  forRegion(regionId: string): Promise<CatchSpot[]>;
  /** The species' catch habitats from the database (T-047), or null if it holds none yet. */
  habitatsOf(speciesId: string): Promise<SpotHabitat[] | null>;
}

type Page = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** The slice of the supabase-js client this needs, so tests can fake it. */
export interface CatchSpotClient {
  from(table: 'catch_spots' | 'species'): {
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string): { range(from: number, to: number): Page };
        maybeSingle(): Page;
      };
    };
  };
}

const PAGE = 1000; // PostgREST's row cap per request

export class SupabaseCatchSpotSource implements CatchSpotSource {
  constructor(private readonly client: CatchSpotClient) {}

  async forRegion(regionId: string): Promise<CatchSpot[]> {
    const all: CatchSpot[] = [];
    for (let from = 0; ; from += PAGE) {
      // Ordered by id, a total order, so pages never overlap or skip.
      const { data, error } = await this.client
        .from('catch_spots')
        .select('id,kind,habitat,name,lat,lon')
        .eq('region_id', regionId)
        .order('id')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`catch spots read failed: ${error.message}`);
      const rows = Array.isArray(data) ? data : [];
      all.push(...parseSpots(rows));
      if (rows.length < PAGE) return all;
    }
  }

  async habitatsOf(speciesId: string): Promise<SpotHabitat[] | null> {
    const { data, error } = await this.client.from('species').select('catch_habitats').eq('id', speciesId).maybeSingle();
    if (error) throw new Error(`species habitats read failed: ${error.message}`);
    const list = (data as { catch_habitats?: unknown } | null)?.catch_habitats;
    if (!Array.isArray(list)) return null;
    const habitats = list.filter((h): h is SpotHabitat => typeof h === 'string' && HABITATS.has(h));
    return habitats.length > 0 ? habitats : null;
  }
}
