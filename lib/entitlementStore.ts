import AsyncStorage from '@react-native-async-storage/async-storage';
import { NO_ENTITLEMENTS, parseEntitlements, serializeEntitlements, type Entitlements } from './entitlement';

// The last entitlements the server reported (T-083), kept on the device so a paying user is not
// shown the free-catch limit while offline outdoors. The server stays the authority: this only
// decides what the UI shows until the next successful read, and the database trigger enforces
// the limit regardless (T-200). Cleared with the account (T-093).

export const ENTITLEMENT_STORAGE_KEY = 'nearby.entitlements.v1';

export interface EntitlementStore {
  load(): Promise<Entitlements>;
  save(e: Entitlements): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryEntitlementStore implements EntitlementStore {
  constructor(private value: Entitlements = NO_ENTITLEMENTS) {}

  async load() {
    return this.value;
  }

  async save(e: Entitlements) {
    this.value = e;
  }

  async clear() {
    this.value = NO_ENTITLEMENTS;
  }
}

/** Failures degrade to locked on load and are ignored on save; the next read retries. */
export class AsyncStorageEntitlementStore implements EntitlementStore {
  async load(): Promise<Entitlements> {
    try {
      return parseEntitlements(await AsyncStorage.getItem(ENTITLEMENT_STORAGE_KEY));
    } catch {
      return NO_ENTITLEMENTS;
    }
  }

  async save(e: Entitlements): Promise<void> {
    try {
      await AsyncStorage.setItem(ENTITLEMENT_STORAGE_KEY, serializeEntitlements(e));
    } catch {
      // Still correct for this session.
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ENTITLEMENT_STORAGE_KEY);
    } catch {
      // Nothing else to do; a stale cache is replaced by the next server read.
    }
  }
}
