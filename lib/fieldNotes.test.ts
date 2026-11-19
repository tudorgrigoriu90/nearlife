import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageFieldNotesStore, FIELD_NOTES_STORAGE_KEY } from './fieldNotesStore';
import {
  NOTE_MAX_CHARS,
  addNote,
  notesFor,
  parseNotes,
} from './fieldNotes';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-347 · review F-07: field notes on a sighting, kept on the phone.
describe('field notes', () => {
  it('adds a trimmed note with its date, newest first for the species', () => {
    let notes = addNote([], 'owl', '2026-11-01', '  Heard it at dusk  ', () => 'n1')!;
    notes = addNote(notes, 'owl', '2026-11-03', 'Saw two', () => 'n2')!;
    notes = addNote(notes, 'fox', '2026-11-02', 'Tracks', () => 'n3')!;
    expect(notesFor(notes, 'owl').map((n) => [n.date, n.text])).toEqual([
      ['2026-11-03', 'Saw two'],
      ['2026-11-01', 'Heard it at dusk'],
    ]);
  });

  it('refuses an empty note, a bad date, and cuts a long one at the limit', () => {
    expect(addNote([], 'owl', '2026-11-01', '   ', () => 'x')).toBeNull();
    expect(addNote([], 'owl', '1 Nov', 'text', () => 'x')).toBeNull();
    const long = addNote([], 'owl', '2026-11-01', 'a'.repeat(NOTE_MAX_CHARS + 50), () => 'x')!;
    expect(long[0].text).toHaveLength(NOTE_MAX_CHARS);
  });

  it('reads only well-formed notes back', () => {
    const good = { id: 'a', speciesId: 'owl', date: '2026-11-01', text: 'x' };
    expect(parseNotes(JSON.stringify([good, { id: 1 }, null]))).toEqual([good]);
    expect(parseNotes('{broken')).toEqual([]);
    expect(parseNotes(null)).toEqual([]);
  });

  it('survives a restart, under a key account deletion erases', async () => {
    const note = { id: 'a', speciesId: 'owl', date: '2026-11-01', text: 'x' };
    await new AsyncStorageFieldNotesStore().save([note]);
    expect(await new AsyncStorageFieldNotesStore().load()).toEqual([note]);
    expect(FIELD_NOTES_STORAGE_KEY.startsWith('nearby.')).toBe(true);
  });

  it('treats storage failures as no notes, and never throws on save', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    expect(await new AsyncStorageFieldNotesStore().load()).toEqual([]);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    await expect(new AsyncStorageFieldNotesStore().save([])).resolves.toBeUndefined();
  });
});
