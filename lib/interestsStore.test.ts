import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageInterestsStore, INTERESTS_STORAGE_KEY } from './interestsStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-390: "Show me" lives on the phone, under the `nearby.` prefix erased with the account.
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AsyncStorageInterestsStore', () => {
  const store = new AsyncStorageInterestsStore();

  it('says when nothing was ever chosen, and round-trips a choice', async () => {
    expect(await store.load()).toEqual({ interests: null, stored: false });
    await store.save(['bird', 'fish']);
    expect(await store.load()).toEqual({ interests: ['bird', 'fish'], stored: true });
    await store.save(null);
    expect(await store.load()).toEqual({ interests: null, stored: true });
    expect(INTERESTS_STORAGE_KEY.startsWith('nearby.')).toBe(true);
  });
});
