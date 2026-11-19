import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageBadgeStore, BADGES_STORAGE_KEY } from './badgeStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-297 · review B-27: earned badges are remembered on the phone.

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AsyncStorageBadgeStore', () => {
  const store = new AsyncStorageBadgeStore();

  it('starts empty and round-trips', async () => {
    expect(await store.load()).toEqual({});
    await store.save({ 'spotted-10': '2026-06-01T10:00:00Z' });
    expect(await store.load()).toEqual({ 'spotted-10': '2026-06-01T10:00:00Z' });
  });

  it('keeps only string dates from what is stored', async () => {
    await AsyncStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify({ a: 'd', b: 3, c: null }));
    expect(await store.load()).toEqual({ a: 'd' });
  });

  it('reads a corrupt or non-object value as nothing remembered', async () => {
    await AsyncStorage.setItem(BADGES_STORAGE_KEY, '{nope');
    expect(await store.load()).toEqual({});
    await AsyncStorage.setItem(BADGES_STORAGE_KEY, '[1,2]');
    expect(await store.load()).toEqual({});
  });

  it('a failed write is not an error', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('full'));
    await expect(store.save({ a: 'd' })).resolves.toBeUndefined();
  });

  it('lives under the erased prefix', () => {
    expect(BADGES_STORAGE_KEY.startsWith('nearby.')).toBe(true);
  });
});
