import { useCallback, useEffect, useState } from 'react';
import { addNote, type FieldNote, type FieldNotesStore } from '../lib/fieldNotes';

/** Field notes in the app (T-347): loaded once, saved on every new note, cleared on deletion. */
export function useFieldNotes(store: FieldNotesStore): {
  notes: FieldNote[];
  add: (speciesId: string, date: string, text: string) => boolean;
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
    (speciesId: string, date: string, text: string) => {
      const next = addNote(notes, speciesId, date, text);
      if (next === null) return false;
      setNotes(next);
      void store.save(next);
      return true;
    },
    [notes, store],
  );
  const reset = useCallback(() => setNotes([]), []);
  return { notes, add, reset };
}
