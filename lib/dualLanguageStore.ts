import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DUAL_LANGUAGE, type DualLanguageSettings } from './dualLanguage';
import { CONTENT_LOCALES, type ContentLocale } from './i18n/contentLocale';

// Dual-display persistence (T-148). Mirrors consentStore: pure parse/serialize helpers, an
// in-memory store for tests, and an AsyncStorage-backed store the app runs on. Device-local only —
// this is a display preference, carries no PII, and never leaves the device.
//
// Parsing is defensive in the same spirit as consent: only a literal `true` enables, and a stored
// language code is accepted only if it is still a known locale. A code that was dropped from the
// roster (or corrupt data) decays to `null` — the feature falls back to single-language display
// rather than trying to render a language the app can no longer resolve.

export const DUAL_LANGUAGE_STORAGE_KEY = 'nearby.dualLanguage.v1';

const KNOWN_LOCALES = new Set<string>(CONTENT_LOCALES);

export function parseDualLanguage(raw: string | null): DualLanguageSettings {
  const out: DualLanguageSettings = { ...DEFAULT_DUAL_LANGUAGE };
  if (!raw) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (typeof parsed !== 'object' || parsed === null) return out;
  const rec = parsed as Record<string, unknown>;

  if (rec.enabled === true) out.enabled = true;
  const secondary = rec.secondaryLocale;
  if (typeof secondary === 'string' && KNOWN_LOCALES.has(secondary)) {
    out.secondaryLocale = secondary as ContentLocale;
  }
  return out;
}

export function serializeDualLanguage(settings: DualLanguageSettings): string {
  return JSON.stringify({
    enabled: settings.enabled === true,
    secondaryLocale: settings.secondaryLocale,
  });
}

export interface DualLanguageStore {
  load(): Promise<DualLanguageSettings>;
  save(settings: DualLanguageSettings): Promise<void>;
}

/** In-memory store for tests and offline defaults; round-trips through the same pure helpers. */
export class InMemoryDualLanguageStore implements DualLanguageStore {
  private raw: string | null;

  constructor(initial: DualLanguageSettings = DEFAULT_DUAL_LANGUAGE) {
    this.raw = serializeDualLanguage(initial);
  }

  async load(): Promise<DualLanguageSettings> {
    return parseDualLanguage(this.raw);
  }

  async save(settings: DualLanguageSettings): Promise<void> {
    this.raw = serializeDualLanguage(settings);
  }
}

/** Device-local persistence. Storage failures degrade to the off default rather than crashing. */
export class AsyncStorageDualLanguageStore implements DualLanguageStore {
  async load(): Promise<DualLanguageSettings> {
    try {
      return parseDualLanguage(await AsyncStorage.getItem(DUAL_LANGUAGE_STORAGE_KEY));
    } catch {
      return { ...DEFAULT_DUAL_LANGUAGE };
    }
  }

  async save(settings: DualLanguageSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(DUAL_LANGUAGE_STORAGE_KEY, serializeDualLanguage(settings));
    } catch {
      // Best-effort: a failed write leaves the in-memory preference authoritative this session.
    }
  }
}
