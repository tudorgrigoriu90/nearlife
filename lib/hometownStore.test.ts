import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AsyncStorageHometownStore,
  deriveHometown,
  HOMETOWN_STORAGE_KEY,
  InMemoryHometownStore,
  parseHometown,
} from './hometownStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const SKANE = { id: 'SWE.13_1', name: 'Skåne' };
const KRONOBERG = { id: 'SWE.9_1', name: 'Kronoberg' };

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('parseHometown', () => {
  it('reads a stored county', () => {
    expect(parseHometown(JSON.stringify(SKANE))).toEqual(SKANE);
  });

  it('rejects missing, corrupt, partial, or unknown regions', () => {
    expect(parseHometown(null)).toBeNull();
    expect(parseHometown('{oops')).toBeNull();
    expect(parseHometown('null')).toBeNull();
    expect(parseHometown(JSON.stringify({ id: 'SWE.13_1' }))).toBeNull();
    // The pre-T-090 prototype id: not a key the server can use, so it must not survive.
    expect(parseHometown(JSON.stringify({ id: 'kronoberg', name: 'Kronoberg' }))).toBeNull();
  });

  it('never carries coordinates through, even if something stored them', () => {
    const raw = JSON.stringify({ ...SKANE, latitude: 55.6, longitude: 13 });
    expect(parseHometown(raw)).toEqual(SKANE);
  });
});

describe.each([
  ['InMemoryHometownStore', () => new InMemoryHometownStore()],
  ['AsyncStorageHometownStore', () => new AsyncStorageHometownStore()],
])('%s', (_name, make) => {
  it('starts empty', async () => {
    await expect(make().load()).resolves.toBeNull();
  });

  it('locks in the first region and keeps it — a later fix elsewhere does not move the user', async () => {
    const store = make();
    await expect(store.lockIn(SKANE)).resolves.toEqual(SKANE);
    await expect(store.lockIn(KRONOBERG)).resolves.toEqual(SKANE);
    await expect(store.load()).resolves.toEqual(SKANE);
  });
});

describe('AsyncStorageHometownStore', () => {
  it('survives a restart and stores only id + name', async () => {
    await new AsyncStorageHometownStore().lockIn(SKANE);
    await expect(new AsyncStorageHometownStore().load()).resolves.toEqual(SKANE);
    expect(JSON.parse((await AsyncStorage.getItem(HOMETOWN_STORAGE_KEY))!)).toEqual(SKANE);
  });

  it('degrades to "no hometown" when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    await expect(new AsyncStorageHometownStore().load()).resolves.toBeNull();
  });

  it('still returns the region for this session when the write fails', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    await expect(new AsyncStorageHometownStore().lockIn(SKANE)).resolves.toEqual(SKANE);
  });
});

describe('deriveHometown', () => {
  const vaxjo = { latitude: 56.879, longitude: 14.806 };

  it('resolves one fix to its county and locks it in', async () => {
    const store = new InMemoryHometownStore();
    await expect(deriveHometown(async () => vaxjo, store)).resolves.toEqual(KRONOBERG);
    await expect(store.load()).resolves.toEqual(KRONOBERG);
  });

  it('returns the locked hometown without asking for a fix at all', async () => {
    const getFix = jest.fn(async () => vaxjo);
    await expect(deriveHometown(getFix, new InMemoryHometownStore(SKANE))).resolves.toEqual(SKANE);
    expect(getFix).not.toHaveBeenCalled();
  });

  it('stores nothing when there is no fix or it is outside Sweden', async () => {
    const store = new InMemoryHometownStore();
    await expect(deriveHometown(async () => null, store)).resolves.toBeNull();
    await expect(deriveHometown(async () => ({ latitude: 59.913, longitude: 10.752 }), store)).resolves.toBeNull();
    await expect(store.load()).resolves.toBeNull();
  });
});
