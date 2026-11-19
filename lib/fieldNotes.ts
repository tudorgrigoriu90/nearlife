// Field notes on a sighting (T-347 · review F-07): a date and a few words about what you saw, so
// spotting is more than one tap from a list. On the phone only: no upload, no location attached,
// erased with the account (the `nearby.` prefix, T-269), listed in the data export. Photos are
// T-348. Storage is lib/fieldNotesStore.ts, so the card can use this without AsyncStorage.

export const NOTE_MAX_CHARS = 1000;

export interface FieldNote {
  id: string;
  speciesId: string;
  /** The day of the sighting, YYYY-MM-DD; today by default. */
  date: string;
  text: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A new list with the note added, or null when there is nothing to keep (empty text, bad date). */
export function addNote(
  notes: FieldNote[],
  speciesId: string,
  date: string,
  text: string,
  newId: () => string = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
): FieldNote[] | null {
  const trimmed = text.trim().slice(0, NOTE_MAX_CHARS);
  if (trimmed.length === 0 || !DATE.test(date)) return null;
  return [...notes, { id: newId(), speciesId, date, text: trimmed }];
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
    return value.filter(
      (n): n is FieldNote =>
        !!n &&
        typeof n === 'object' &&
        typeof (n as FieldNote).id === 'string' &&
        typeof (n as FieldNote).speciesId === 'string' &&
        typeof (n as FieldNote).date === 'string' &&
        DATE.test((n as FieldNote).date) &&
        typeof (n as FieldNote).text === 'string',
    );
  } catch {
    return [];
  }
}

export interface FieldNotesStore {
  load(): Promise<FieldNote[]>;
  save(notes: FieldNote[]): Promise<void>;
}
