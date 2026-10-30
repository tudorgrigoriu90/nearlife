import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSpots, type CatchSpot } from './catchSpots';

// The last catch spots downloaded per county (T-068), so the catch screen works offline, which
// is where people catch: in a forest with no signal. Public data only (designated public
// places), never the user's position.

const key = (regionId: string) => `nearby.catchSpots.v1.${regionId}`;

export interface CatchSpotStore {
  load(regionId: string): Promise<CatchSpot[] | null>;
  save(regionId: string, spots: CatchSpot[]): Promise<void>;
}

export class InMemoryCatchSpotStore implements CatchSpotStore {
  private readonly byRegion = new Map<string, CatchSpot[]>();

  async load(regionId: string) {
    return this.byRegion.get(regionId) ?? null;
  }

  async save(regionId: string, spots: CatchSpot[]) {
    this.byRegion.set(regionId, spots);
  }
}

export class AsyncStorageCatchSpotStore implements CatchSpotStore {
  async load(regionId: string): Promise<CatchSpot[] | null> {
    try {
      const raw = await AsyncStorage.getItem(key(regionId));
      return raw === null ? null : parseSpots(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(regionId: string, spots: CatchSpot[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key(regionId), JSON.stringify(spots));
    } catch {
      // Offline catching then needs a connection once more; nothing else breaks.
    }
  }
}
