// Field notes on a sighting (T-347 · review F-07): a date and a few words about what you saw, so
// spotting is more than one tap from a list. On the phone only: no upload, no location attached,
// erased with the account (the `nearby.` prefix, T-269), listed in the data export. A note may
// carry one photo (T-348): the file stays in the app's own folder (lib/notePhotos.ts) and the note,
// like the export, holds only its file name. Storage is lib/fieldNotesStore.ts, so the card can use
// this without AsyncStorage.

export const NOTE_MAX_CHARS = 1000;

export interface FieldNote {
  id: string;
  speciesId: string;
  /** The day of the sighting, YYYY-MM-DD; today by default. */
  date: string;
  text: string;
  /** The photo's file name in the notes folder (T-348); absent when there is none. */
  photo?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A file name, never a path: a stored note must not point outside the notes folder. */
const PHOTO_NAME = /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/;

/** A new list with the note added, or null when there is nothing to keep (empty text, bad date). */
export function addNote(
  notes: FieldNote[],
  speciesId: string,
  date: string,
  text: string,
  newId: () => string = newNoteId,
  photo?: string,
): FieldNote[] | null {
  const trimmed = text.trim().slice(0, NOTE_MAX_CHARS);
  if (trimmed.length === 0 || !DATE.test(date)) return null;
  const note: FieldNote = { id: newId(), speciesId, date, text: trimmed };
  if (photo && PHOTO_NAME.test(photo)) note.photo = photo;
  return [...notes, note];
}

export function newNoteId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Whether a note with this text and date would be kept (checked before a photo is copied). */
export function isKeepable(date: string, text: string): boolean {
  return text.trim().length > 0 && DATE.test(date);
}

/** A species' notes, newest day first. */
export function notesFor(notes: FieldNote[], speciesId: string): FieldNote[] {
  return notes.filter((n) => n.speciesId === speciesId).sort((a, b) => b.date.localeCompare(a.date));
}

export function parseNotes(raw: string | null): FieldNote[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const notes = value.filter(
      (n): n is FieldNote =>
        !!n &&
        typeof n === 'object' &&
        typeof (n as FieldNote).id === 'string' &&
        typeof (n as FieldNote).speciesId === 'string' &&
        typeof (n as FieldNote).date === 'string' &&
        DATE.test((n as FieldNote).date) &&
        typeof (n as FieldNote).text === 'string',
    );
    // A photo name that is not a plain file name is dropped; the note itself stays.
    return notes.map((n) => {
      if (n.photo === undefined || (typeof n.photo === 'string' && PHOTO_NAME.test(n.photo))) return n;
      const { photo: _dropped, ...rest } = n;
      return rest;
    });
  } catch {
    return [];
  }
}

export interface FieldNotesStore {
  load(): Promise<FieldNote[]>;
  save(notes: FieldNote[]): Promise<void>;
}
