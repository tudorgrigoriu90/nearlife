import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseTravelLog, serializeTravelLog, type TravelLog } from './travel';

// Which counties the travel banner has offered, and when (T-218). Device-only; counties and times,
// never positions. Cleared with the account (T-093).

export const TRAVEL_STORAGE_KEY = 'nearby.travel.v1';

export interface TravelStore {
  load(): Promise<TravelLog>;
  save(log: TravelLog): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryTravelStore implements TravelStore {
  constructor(private log: TravelLog = {}) {}

  async load() {
    return this.log;
  }

  async save(log: TravelLog) {
    this.log = log;
  }

  async clear() {
    this.log = {};
  }
}

export class AsyncStorageTravelStore implements TravelStore {
  async load(): Promise<TravelLog> {
    try {
      return parseTravelLog(await AsyncStorage.getItem(TRAVEL_STORAGE_KEY));
    } catch {
      return {};
    }
  }

  async save(log: TravelLog): Promise<void> {
    try {
      await AsyncStorage.setItem(TRAVEL_STORAGE_KEY, serializeTravelLog(log));
    } catch {
      // At worst the same county is offered again after a restart.
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TRAVEL_STORAGE_KEY);
    } catch {
      // Nothing else to do.
    }
  }
}
