import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPPORTED_LOCALES, type Locale } from './i18n';

// The user's language choice from Settings (T-211). Before this it lived in plain component state,
// so any restart fell back to the device language — and because push registration sends the UI
// locale (T-201), the daily notification silently switched language too. Device-local, no PII.
//
// Same defensive parsing as the other stores: a code that is no longer a supported locale (or
// corrupt data) means "no override", i.e. follow the device.

export const LOCALE_STORAGE_KEY = 'nearby.locale.v1';

const SUPPORTED = new Set<string>(SUPPORTED_LOCALES);

export function parseLocaleOverride(raw: string | null): Locale | null {
  return raw !== null && SUPPORTED.has(raw) ? (raw as Locale) : null;
}

export interface LocaleStore {
  load(): Promise<Locale | null>;
  save(locale: Locale): Promise<void>;
}

export class InMemoryLocaleStore implements LocaleStore {
  constructor(private locale: Locale | null = null) {}

  async load() {
    return this.locale;
  }

  async save(locale: Locale) {
    this.locale = locale;
  }
}

/** Failures degrade to "follow the device language" on load and are ignored on save. */
export class AsyncStorageLocaleStore implements LocaleStore {
  async load(): Promise<Locale | null> {
    try {
      return parseLocaleOverride(await AsyncStorage.getItem(LOCALE_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  async save(locale: Locale): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // The choice still holds for this session.
    }
  }
}
