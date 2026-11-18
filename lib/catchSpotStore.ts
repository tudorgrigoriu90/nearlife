import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSpots, type CatchSpot } from './catchSpots';

// The last catch spots downloaded per county (T-068), so the catch screen works offline, which
// is where people catch: in a forest with no signal. Public data only (designated public
// places), never the user's position.

const key = (regionId: string) => `nearby.catchSpots.v1.${regionId}`;

/** Saved spots younger than this are used without asking the server (T-275 · review B-20). */
export const SPOTS_MAX_AGE_MS = 30 * 24 * 3600_000;

export interface SavedSpots {
  spots: CatchSpot[];
  /** When they were downloaded; 0 for spots saved before T-275 (always refreshed). */
  savedAt: number;
}

export interface CatchSpotStore {
  load(regionId: string): Promise<CatchSpot[] | null>;
  loadSaved(regionId: string): Promise<SavedSpots | null>;
  save(regionId: string, spots: CatchSpot[], savedAt?: number): Promise<void>;
}

export class InMemoryCatchSpotStore implements CatchSpotStore {
  private readonly byRegion = new Map<string, SavedSpots>();

  async load(regionId: string) {
    return this.byRegion.get(regionId)?.spots ?? null;
  }

  async loadSaved(regionId: string) {
    return this.byRegion.get(regionId) ?? null;
  }

  async save(regionId: string, spots: CatchSpot[], savedAt = Date.now()) {
    this.byRegion.set(regionId, { spots, savedAt });
  }
}

export class AsyncStorageCatchSpotStore implements CatchSpotStore {
  async load(regionId: string): Promise<CatchSpot[] | null> {
    return (await this.loadSaved(regionId))?.spots ?? null;
  }

  async loadSaved(regionId: string): Promise<SavedSpots | null> {
    try {
      const raw = await AsyncStorage.getItem(key(regionId));
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      // Before T-275 the value was the bare list.
      if (Array.isArray(parsed)) return { spots: parseSpots(parsed), savedAt: 0 };
      const saved = parsed as { spots?: unknown; savedAt?: unknown };
      return {
        spots: parseSpots(saved.spots),
        savedAt: typeof saved.savedAt === 'number' ? saved.savedAt : 0,
      };
    } catch {
      return null;
    }
  }

  async save(regionId: string, spots: CatchSpot[], savedAt = Date.now()): Promise<void> {
    try {
      await AsyncStorage.setItem(key(regionId), JSON.stringify({ spots, savedAt }));
    } catch {
      // Offline catching then needs a connection once more; nothing else breaks.
    }
  }
}
