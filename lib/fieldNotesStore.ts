import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseNotes, type FieldNote, type FieldNotesStore } from './fieldNotes';

// Field notes on the phone (T-347): one AsyncStorage item, erased with the account (T-269).

export const FIELD_NOTES_STORAGE_KEY = 'nearby.notes.v1';

export class AsyncStorageFieldNotesStore implements FieldNotesStore {
  async load(): Promise<FieldNote[]> {
    try {
      return parseNotes(await AsyncStorage.getItem(FIELD_NOTES_STORAGE_KEY));
    } catch {
      return [];
    }
  }

  async save(notes: FieldNote[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FIELD_NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // Best-effort: the note stays on screen for this session.
    }
  }
}
