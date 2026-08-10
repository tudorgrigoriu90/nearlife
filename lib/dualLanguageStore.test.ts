import { DEFAULT_DUAL_LANGUAGE, type DualLanguageSettings } from './dualLanguage';
import {
  AsyncStorageDualLanguageStore,
  DUAL_LANGUAGE_STORAGE_KEY,
  InMemoryDualLanguageStore,
  parseDualLanguage,
  serializeDualLanguage,
} from './dualLanguageStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

const enabledSv: DualLanguageSettings = { enabled: true, secondaryLocale: 'sv' };

describe('parseDualLanguage', () => {
  it('round-trips a saved preference', () => {
    expect(parseDualLanguage(serializeDualLanguage(enabledSv))).toEqual(enabledSv);
  });

  it('defaults to off for empty, corrupt, or non-object data', () => {
    for (const raw of [null, '', 'not json', '[]', '"string"', 'null', '42']) {
      expect(parseDualLanguage(raw)).toEqual(DEFAULT_DUAL_LANGUAGE);
    }
  });

  it('only a literal true enables — truthy lookalikes stay off', () => {
    for (const value of ['true', 1, 'yes', {}]) {
      expect(parseDualLanguage(JSON.stringify({ enabled: value })).enabled).toBe(false);
    }
  });

  it('drops a language code that is not a known locale', () => {
    // A code removed from the roster, or corrupt data, must not reach the renderer.
    expect(parseDualLanguage('{"enabled":true,"secondaryLocale":"xx"}')).toEqual({
      enabled: true,
      secondaryLocale: null,
    });
    expect(parseDualLanguage('{"enabled":true,"secondaryLocale":42}').secondaryLocale).toBeNull();
  });

  it('accepts a language from the immigrant roster', () => {
    expect(parseDualLanguage('{"enabled":true,"secondaryLocale":"ti"}').secondaryLocale).toBe('ti');
  });

  it('ignores stray keys', () => {
    expect(parseDualLanguage('{"enabled":true,"secondaryLocale":"sv","junk":1}')).toEqual(enabledSv);
  });
});

describe('serializeDualLanguage', () => {
  it('writes strict booleans and drops anything unknown', () => {
    const dirty = { enabled: 'yes', secondaryLocale: 'sv', junk: 1 } as unknown as DualLanguageSettings;
    expect(JSON.parse(serializeDualLanguage(dirty))).toEqual({
      enabled: false,
      secondaryLocale: 'sv',
    });
  });
});

describe('InMemoryDualLanguageStore', () => {
  it('defaults to off', async () => {
    expect(await new InMemoryDualLanguageStore().load()).toEqual(DEFAULT_DUAL_LANGUAGE);
  });

  it('persists what was saved', async () => {
    const store = new InMemoryDualLanguageStore();
    await store.save(enabledSv);
    expect(await store.load()).toEqual(enabledSv);
  });
});

describe('AsyncStorageDualLanguageStore', () => {
  const store = new AsyncStorageDualLanguageStore();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('round-trips through device storage under a versioned key', async () => {
    await store.save(enabledSv);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      DUAL_LANGUAGE_STORAGE_KEY,
      serializeDualLanguage(enabledSv),
    );
    expect(await store.load()).toEqual(enabledSv);
  });

  it('falls back to off when the read throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await store.load()).toEqual(DEFAULT_DUAL_LANGUAGE);
  });

  it('swallows a failed write — the in-session preference still holds', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(store.save(enabledSv)).resolves.toBeUndefined();
  });
});
