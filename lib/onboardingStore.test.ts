import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AsyncStorageOnboardingStore,
  InMemoryOnboardingStore,
  ONBOARDING_STORAGE_KEY,
  parseOnboarding,
} from './onboardingStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('parseOnboarding', () => {
  it('reads both age paths', () => {
    expect(parseOnboarding('{"agePath":"full"}')).toEqual({ agePath: 'full' });
    expect(parseOnboarding('{"agePath":"restricted"}')).toEqual({ agePath: 'restricted' });
  });

  it('treats a record without a valid age path as not onboarded — never as an adult', () => {
    expect(parseOnboarding(null)).toBeNull();
    expect(parseOnboarding('{oops')).toBeNull();
    expect(parseOnboarding('null')).toBeNull();
    expect(parseOnboarding('{}')).toBeNull();
    expect(parseOnboarding('{"agePath":"adult"}')).toBeNull();
  });

  it('drops anything else that was stored, such as a birth year', () => {
    expect(parseOnboarding('{"agePath":"full","birthYear":1990}')).toEqual({ agePath: 'full' });
  });
});

describe.each([
  ['InMemoryOnboardingStore', () => new InMemoryOnboardingStore()],
  ['AsyncStorageOnboardingStore', () => new AsyncStorageOnboardingStore()],
])('%s', (_name, make) => {
  it('starts not onboarded, remembers completion, and forgets it on clear', async () => {
    const store = make();
    await expect(store.load()).resolves.toBeNull();
    await store.save({ agePath: 'restricted' });
    await expect(store.load()).resolves.toEqual({ agePath: 'restricted' });
    await store.clear();
    await expect(store.load()).resolves.toBeNull();
  });
});

describe('AsyncStorageOnboardingStore', () => {
  it('survives a restart and stores only the age path', async () => {
    await new AsyncStorageOnboardingStore().save({ agePath: 'full', birthYear: 1990 } as never);
    await expect(new AsyncStorageOnboardingStore().load()).resolves.toEqual({ agePath: 'full' });
    expect(await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('{"agePath":"full"}');
  });

  it('degrades to "not onboarded" when storage fails, and never throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk'));
    const store = new AsyncStorageOnboardingStore();
    await expect(store.load()).resolves.toBeNull();
    await expect(store.save({ agePath: 'full' })).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
  });
});
