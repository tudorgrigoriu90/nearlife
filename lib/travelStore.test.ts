import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageTravelStore, TRAVEL_STORAGE_KEY } from './travelStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-333 · review I-17: the travel banner's memory (T-218) survives a restart and never throws.
describe('AsyncStorageTravelStore', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps which counties were offered across launches, and clears them', async () => {
    const log = { 'SWE.13_1': Date.UTC(2026, 10, 1) };
    await new AsyncStorageTravelStore().save(log);
    expect(await new AsyncStorageTravelStore().load()).toEqual(log);
    await new AsyncStorageTravelStore().clear();
    expect(await AsyncStorage.getItem(TRAVEL_STORAGE_KEY)).toBeNull();
    expect(await new AsyncStorageTravelStore().load()).toEqual({});
  });

  it('treats storage failures as an empty log, and swallows failed writes', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    expect(await new AsyncStorageTravelStore().load()).toEqual({});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    await expect(new AsyncStorageTravelStore().save({})).resolves.toBeUndefined();
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk'));
    await expect(new AsyncStorageTravelStore().clear()).resolves.toBeUndefined();
  });
});
