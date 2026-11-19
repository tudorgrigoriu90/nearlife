import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseTrainer, type NameTrainerStore, type TrainerState } from './nameTrainer';

// The name trainer's schedule on the phone (T-351): one AsyncStorage item, erased with the
// account (the `nearby.` prefix, T-269) and listed in the data export.

export const NAME_TRAINER_STORAGE_KEY = 'nearby.nameTrainer.v1';

export class AsyncStorageNameTrainerStore implements NameTrainerStore {
  async load(): Promise<TrainerState> {
    try {
      return parseTrainer(await AsyncStorage.getItem(NAME_TRAINER_STORAGE_KEY));
    } catch {
      return {};
    }
  }

  async save(state: TrainerState): Promise<void> {
    try {
      await AsyncStorage.setItem(NAME_TRAINER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Best-effort: the answer counts for this session.
    }
  }
}
