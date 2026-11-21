import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseInterests, type Interests } from './interests';

// "Show me" (T-390) on the phone: one item, erased with the account (the `nearby.` prefix, T-269)
// and listed in the data export. `stored` tells a first run from a choice of "everything", so a
// group choice made in the notification settings before T-390 can be adopted once.

export const INTERESTS_STORAGE_KEY = 'nearby.interests.v1';

export interface InterestsStore {
  load(): Promise<{ interests: Interests; stored: boolean }>;
  save(interests: Interests): Promise<void>;
}

export class AsyncStorageInterestsStore implements InterestsStore {
  async load(): Promise<{ interests: Interests; stored: boolean }> {
    try {
      const raw = await AsyncStorage.getItem(INTERESTS_STORAGE_KEY);
      return { interests: parseInterests(raw), stored: raw !== null };
    } catch {
      return { interests: null, stored: false };
    }
  }

  async save(interests: Interests): Promise<void> {
    try {
      await AsyncStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(interests ?? 'all'));
    } catch {
      // Best-effort: the choice holds for this session.
    }
  }
}
