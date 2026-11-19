import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RememberedBadges } from './badges';

// Earned badges, remembered on the phone with the date first earned (T-297 · review B-27), so a
// badge never shows locked again when the species list behind it changes (a catalogue refresh,
// another county on screen). Erased with the account (the `nearby.` prefix, T-269) and part of the
// export's device section.

export const BADGES_STORAGE_KEY = 'nearby.badges.v1';

export interface BadgeStore {
  load(): Promise<RememberedBadges>;
  save(badges: RememberedBadges): Promise<void>;
}

export class AsyncStorageBadgeStore implements BadgeStore {
  async load(): Promise<RememberedBadges> {
    try {
      const raw = await AsyncStorage.getItem(BADGES_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string'),
      );
    } catch {
      return {};
    }
  }

  async save(badges: RememberedBadges): Promise<void> {
    try {
      await AsyncStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(badges));
    } catch {
      // Not remembering a badge costs a re-earn at worst; nothing else depends on it.
    }
  }
}
