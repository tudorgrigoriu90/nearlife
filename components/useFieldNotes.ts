import { useCallback, useEffect, useState } from 'react';
import { addNote, isKeepable, newNoteId, type FieldNote, type FieldNotesStore } from '../lib/fieldNotes';
import type { NotePhotoFiles } from '../lib/notePhotos';

/** Field notes in the app (T-347): loaded once, saved on every new note, cleared on deletion. */
export function useFieldNotes(
  store: FieldNotesStore,
  /** Where note photos are kept (T-348); without it a note takes no photo. */
  photos?: NotePhotoFiles,
): {
  notes: FieldNote[];
  add: (speciesId: string, date: string, text: string, photoUri?: string | null) => boolean;
  reset: () => void;
} {
  const [notes, setNotes] = useState<FieldNote[]>([]);
  useEffect(() => {
    let live = true;
    void store.load().then((loaded) => live && setNotes(loaded));
    return () => {
      live = false;
    };
  }, [store]);
  const add = useCallback(
    (speciesId: string, date: string, text: string, photoUri?: string | null) => {
      // Checked first, so a refused note never leaves a copied photo behind.
      if (!isKeepable(date, text)) return false;
      const id = newNoteId();
      const photo = photoUri && photos ? photos.keep(photoUri, id) : null;
      const next = addNote(notes, speciesId, date, text, () => id, photo ?? undefined);
      if (next === null) return false;
      setNotes(next);
      void store.save(next);
      return true;
    },
    [notes, store, photos],
  );
  const reset = useCallback(() => setNotes([]), []);
  return { notes, add, reset };
}
