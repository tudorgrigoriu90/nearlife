import AsyncStorage from '@react-native-async-storage/async-storage';
import { NO_ENTITLEMENTS, resolveEntitlements } from './entitlement';
import { AsyncStorageEntitlementStore, ENTITLEMENT_STORAGE_KEY } from './entitlementStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => AsyncStorage.clear());

describe('AsyncStorageEntitlementStore', () => {
  it('is locked before anything is cached', async () => {
    await expect(new AsyncStorageEntitlementStore().load()).resolves.toEqual(NO_ENTITLEMENTS);
  });

  it('keeps what the server last said across restarts', async () => {
    const owned = resolveEntitlements(['family']);
    await new AsyncStorageEntitlementStore().save(owned);
    await expect(new AsyncStorageEntitlementStore().load()).resolves.toEqual(owned);
  });

  it('forgets everything on clear (account deletion)', async () => {
    const store = new AsyncStorageEntitlementStore();
    await store.save(resolveEntitlements(['full_game']));
    await store.clear();
    expect(await AsyncStorage.getItem(ENTITLEMENT_STORAGE_KEY)).toBeNull();
    await expect(store.load()).resolves.toEqual(NO_ENTITLEMENTS);
  });
});
