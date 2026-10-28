import AsyncStorage from '@react-native-async-storage/async-storage';
import { SWEDISH_COUNTY_SHAPES } from './geo/swedishCounties';
import { resolveHometown, type Coordinates, type Region } from './hometown';

// Hometown persistence (T-090). The hometown is LOCKED once set (ECONOMY.md: the home region is
// what free catches and the regional collection hang off, so letting it drift with every location
// fix would let a user farm regions by travelling). `lockIn` therefore never overwrites: the first
// region stored wins, and a later fix only ever reads it back. Changing it is a support action.
//
// Only the region id + name are stored — never coordinates (PRIVACY §1).

export const HOMETOWN_STORAGE_KEY = 'nearby.hometown.v1';

const KNOWN_IDS = new Set(SWEDISH_COUNTY_SHAPES.map((s) => s.id));

/** Stored JSON → Region, or null for anything missing, corrupt, or not a county we know. */
export function parseHometown(raw: string | null): Region | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<Region> | null;
    if (typeof value?.id !== 'string' || typeof value.name !== 'string') return null;
    return KNOWN_IDS.has(value.id) ? { id: value.id, name: value.name } : null;
  } catch {
    return null;
  }
}

export interface HometownStore {
  load(): Promise<Region | null>;
  /** Store `region` unless a hometown is already set; returns the hometown now in force. */
  lockIn(region: Region): Promise<Region>;
}

export class InMemoryHometownStore implements HometownStore {
  constructor(private region: Region | null = null) {}

  async load() {
    return this.region;
  }

  async lockIn(region: Region) {
    this.region ??= region;
    return this.region;
  }
}

export class AsyncStorageHometownStore implements HometownStore {
  async load(): Promise<Region | null> {
    try {
      return parseHometown(await AsyncStorage.getItem(HOMETOWN_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  async lockIn(region: Region): Promise<Region> {
    const existing = await this.load();
    if (existing !== null) return existing;
    try {
      await AsyncStorage.setItem(HOMETOWN_STORAGE_KEY, JSON.stringify({ id: region.id, name: region.name }));
    } catch {
      // Best-effort: the region still holds in memory for this session and is re-derived next time.
    }
    return region;
  }
}

/**
 * The hometown for this user: the locked one if set, else one fix resolved to a county and locked
 * in. Null when there is no fix or it is outside Sweden — the app then runs in preview mode. The
 * coordinates never outlive this call.
 */
export async function deriveHometown(
  getFix: () => Promise<Coordinates | null>,
  store: HometownStore,
): Promise<Region | null> {
  const locked = await store.load();
  if (locked !== null) return locked;
  const fix = await getFix();
  const region = fix === null ? null : resolveHometown(fix);
  return region === null ? null : store.lockIn(region);
}
