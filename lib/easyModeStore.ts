import AsyncStorage from '@react-native-async-storage/async-storage';

// Easy catching (T-331 · review I-25). The person's own choice, when they have made one; until
// then the app follows the system: someone who asked their phone for reduced motion starts in easy
// mode, since the games' motion is the play itself and cannot simply be switched off (T-330).

export const EASY_MODE_STORAGE_KEY = 'nearby.easyMode.v1';

/** true / false once chosen in Settings; null = follow the system's reduced-motion setting. */
export type EasyChoice = boolean | null;

export function parseEasyChoice(raw: string | null): EasyChoice {
  return raw === 'on' ? true : raw === 'off' ? false : null;
}

/** Whether the games run in easy mode. */
export function easyModeOn(choice: EasyChoice, reduceMotion: boolean): boolean {
  return choice ?? reduceMotion;
}

export interface EasyModeStore {
  load(): Promise<EasyChoice>;
  save(on: boolean): Promise<void>;
}

export class InMemoryEasyModeStore implements EasyModeStore {
  constructor(private choice: EasyChoice = null) {}

  async load() {
    return this.choice;
  }

  async save(on: boolean) {
    this.choice = on;
  }
}

/** A storage failure only means the system setting decides, as on a first run. */
export class AsyncStorageEasyModeStore implements EasyModeStore {
  async load(): Promise<EasyChoice> {
    try {
      return parseEasyChoice(await AsyncStorage.getItem(EASY_MODE_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  async save(on: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(EASY_MODE_STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // Best-effort: the switch still applies for this session.
    }
  }
}
