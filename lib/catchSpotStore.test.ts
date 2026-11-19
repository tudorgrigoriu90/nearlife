import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CatchSpot } from './catchSpots';
import { AsyncStorageCatchSpotStore, InMemoryCatchSpotStore } from './catchSpotStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-068 / T-275 (review B-20): the last downloaded spots per county, with when they were saved,
// so a county is downloaded at most once in 30 days and catching works with no signal.

const SPOT: CatchSpot = { id: 'way/1', kind: 'park', habitat: 'land', name: 'Linnéparken', lat: 56.88, lon: 14.8 };
const KEY = 'nearby.catchSpots.v1.SWE.9_1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AsyncStorageCatchSpotStore', () => {
  const store = new AsyncStorageCatchSpotStore();

  it('has nothing for a county never downloaded', async () => {
    expect(await store.loadSaved('SWE.9_1')).toBeNull();
    expect(await store.load('SWE.9_1')).toBeNull();
  });

  it('keeps the spots with the time they were downloaded', async () => {
    await store.save('SWE.9_1', [SPOT], 1_700_000_000_000);
    expect(await store.loadSaved('SWE.9_1')).toEqual({ spots: [SPOT], savedAt: 1_700_000_000_000 });
    expect(await store.load('SWE.9_1')).toEqual([SPOT]);
  });

  it('keeps each county apart', async () => {
    await store.save('SWE.9_1', [SPOT], 1);
    expect(await store.load('SWE.13_1')).toBeNull();
  });

  it('reads a list saved before T-275 as needing a refresh', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([SPOT]));
    expect(await store.loadSaved('SWE.9_1')).toEqual({ spots: [SPOT], savedAt: 0 });
  });

  it('treats a missing time as needing a refresh', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ spots: [SPOT] }));
    expect(await store.loadSaved('SWE.9_1')).toEqual({ spots: [SPOT], savedAt: 0 });
  });

  it('drops malformed spots rather than showing them', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ spots: [SPOT, { id: 'x' }], savedAt: 5 }));
    expect(await store.loadSaved('SWE.9_1')).toEqual({ spots: [SPOT], savedAt: 5 });
  });

  it('a corrupt value reads as nothing saved', async () => {
    await AsyncStorage.setItem(KEY, '{not json');
    expect(await store.loadSaved('SWE.9_1')).toBeNull();
  });

  it('a failed write is not an error for the catch screen', async () => {
    // The storage mock is itself a jest.fn: reject once, and leave its implementation alone.
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(store.save('SWE.9_1', [SPOT])).resolves.toBeUndefined();
  });

  it('stamps the save time when none is given', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(42);
    await store.save('SWE.9_1', [SPOT]);
    expect((await store.loadSaved('SWE.9_1'))?.savedAt).toBe(42);
  });
});

describe('InMemoryCatchSpotStore', () => {
  it('round-trips spots and their time', async () => {
    const store = new InMemoryCatchSpotStore();
    expect(await store.load('SWE.9_1')).toBeNull();
    await store.save('SWE.9_1', [SPOT], 7);
    expect(await store.loadSaved('SWE.9_1')).toEqual({ spots: [SPOT], savedAt: 7 });
    expect(await store.load('SWE.9_1')).toEqual([SPOT]);
  });
});
