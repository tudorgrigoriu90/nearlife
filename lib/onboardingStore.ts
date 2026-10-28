import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AgePath } from './ageGate';

// Onboarding completion (T-209). Without it, every cold start replayed welcome → age gate →
// location → notifications, and a notification tap (T-031) waited behind the whole flow.
//
// The age path is stored with it, because it is the one onboarding answer the app keeps acting on:
// `restricted` (under 13, T-089) withholds the analytics opt-in for good. Losing it on restart would
// quietly offer analytics to a child — so a record without a valid age path is treated as no record
// at all, and the user goes through onboarding (and the age gate) again.
//
// The birth year itself is never stored (data minimisation, T-089) — only the derived path.

export const ONBOARDING_STORAGE_KEY = 'nearby.onboarding.v1';

export interface OnboardingRecord {
  agePath: AgePath;
}

export function parseOnboarding(raw: string | null): OnboardingRecord | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<OnboardingRecord> | null;
    return value?.agePath === 'full' || value?.agePath === 'restricted' ? { agePath: value.agePath } : null;
  } catch {
    return null;
  }
}

export interface OnboardingStore {
  load(): Promise<OnboardingRecord | null>;
  save(record: OnboardingRecord): Promise<void>;
  /** Account deletion only — back to first run. */
  clear(): Promise<void>;
}

export class InMemoryOnboardingStore implements OnboardingStore {
  constructor(private record: OnboardingRecord | null = null) {}

  async load() {
    return this.record;
  }

  async save(record: OnboardingRecord) {
    this.record = { agePath: record.agePath };
  }

  async clear() {
    this.record = null;
  }
}

/** Storage failures degrade to "not onboarded" — re-running onboarding is safe, skipping it is not. */
export class AsyncStorageOnboardingStore implements OnboardingStore {
  async load(): Promise<OnboardingRecord | null> {
    try {
      return parseOnboarding(await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  async save(record: OnboardingRecord): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ agePath: record.agePath }));
    } catch {
      // Best-effort: the next launch simply onboards again.
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // Nothing to undo; a stale record would only skip onboarding for a deleted account's device.
    }
  }
}
