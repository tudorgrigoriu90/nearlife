import {
  AsyncStorageConsentStore,
  CONSENT_STORAGE_KEY,
  InMemoryConsentStore,
  parseConsent,
  serializeConsent,
} from './consentStore';
import { DEFAULT_CONSENT, grant, type ConsentState } from './consent';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('parseConsent', () => {
  it('returns the all-off default for null / empty / corrupt input', () => {
    expect(parseConsent(null)).toEqual(DEFAULT_CONSENT);
    expect(parseConsent('')).toEqual(DEFAULT_CONSENT);
    expect(parseConsent('{not json')).toEqual(DEFAULT_CONSENT);
    expect(parseConsent('42')).toEqual(DEFAULT_CONSENT);
    expect(parseConsent('null')).toEqual(DEFAULT_CONSENT);
  });

  it('only a literal `true` grants — everything else decays to OFF (no pre-ticked boxes)', () => {
    expect(parseConsent(JSON.stringify({ analytics: 'true', location: 1, notifications: false }))).toEqual(
      DEFAULT_CONSENT,
    );
  });

  it('reads back granted kinds and defaults any missing kind to off', () => {
    expect(parseConsent(JSON.stringify({ analytics: true }))).toEqual({
      location: false,
      notifications: false,
      analytics: true,
    });
  });
});

describe('serializeConsent', () => {
  it('keeps only the known kinds and strict booleans', () => {
    const messy = { location: true, notifications: false, analytics: true, ads: true } as unknown as ConsentState;
    expect(JSON.parse(serializeConsent(messy))).toEqual({
      location: true,
      notifications: false,
      analytics: true,
    });
  });

  it('round-trips through parseConsent', () => {
    const state = grant(DEFAULT_CONSENT, 'notifications');
    expect(parseConsent(serializeConsent(state))).toEqual(state);
  });
});

describe('InMemoryConsentStore', () => {
  it('round-trips a saved state', async () => {
    const store = new InMemoryConsentStore();
    expect(await store.load()).toEqual(DEFAULT_CONSENT);
    const next = grant(DEFAULT_CONSENT, 'analytics');
    await store.save(next);
    expect(await store.load()).toEqual(next);
  });
});

describe('AsyncStorageConsentStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to all-off when nothing is stored', async () => {
    expect(await new AsyncStorageConsentStore().load()).toEqual(DEFAULT_CONSENT);
  });

  it('persists and reloads granted consent under the versioned key', async () => {
    const store = new AsyncStorageConsentStore();
    const next = grant(grant(DEFAULT_CONSENT, 'location'), 'analytics');
    await store.save(next);
    expect(await store.load()).toEqual(next);
    // stored under the versioned key, serialized to the clean shape
    expect(JSON.parse((await AsyncStorage.getItem(CONSENT_STORAGE_KEY))!)).toEqual(next);
  });
});
