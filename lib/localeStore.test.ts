import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AsyncStorageLocaleStore,
  InMemoryLocaleStore,
  LOCALE_STORAGE_KEY,
  parseLocaleOverride,
} from './localeStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('parseLocaleOverride', () => {
  it('accepts a supported UI locale', () => {
    expect(parseLocaleOverride('sv')).toBe('sv');
  });

  it('treats unknown, unsupported or missing values as "follow the device"', () => {
    expect(parseLocaleOverride(null)).toBeNull();
    expect(parseLocaleOverride('')).toBeNull();
    expect(parseLocaleOverride('xx')).toBeNull();
    expect(parseLocaleOverride('ar')).toBeNull(); // a content locale, not a UI one
  });
});

describe.each([
  ['InMemoryLocaleStore', () => new InMemoryLocaleStore()],
  ['AsyncStorageLocaleStore', () => new AsyncStorageLocaleStore()],
])('%s', (_name, make) => {
  it('remembers the chosen language', async () => {
    const store = make();
    await expect(store.load()).resolves.toBeNull();
    await store.save('sv');
    await expect(store.load()).resolves.toBe('sv');
  });
});

describe('AsyncStorageLocaleStore', () => {
  it('survives a restart', async () => {
    await new AsyncStorageLocaleStore().save('sv');
    await expect(new AsyncStorageLocaleStore().load()).resolves.toBe('sv');
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('sv');
  });

  it('degrades to the device language when storage fails, and never throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    const store = new AsyncStorageLocaleStore();
    await expect(store.load()).resolves.toBeNull();
    await expect(store.save('sv')).resolves.toBeUndefined();
  });
});
