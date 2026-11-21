import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { FieldNote, FieldNotesStore } from '../lib/fieldNotes';
import { useFieldNotes } from './useFieldNotes';

// T-347 · review F-07.
function store(initial: FieldNote[] = []): FieldNotesStore & { saved: FieldNote[][] } {
  const saved: FieldNote[][] = [];
  return { saved, load: async () => initial, save: async (n) => void saved.push(n) };
}

describe('useFieldNotes', () => {
  it('loads saved notes, keeps a new one, and saves the list', async () => {
    const s = store([{ id: 'a', speciesId: 'owl', date: '2026-11-01', text: 'old' }]);
    const { result } = await renderHook(() => useFieldNotes(s));
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    let kept = false;
    await act(async () => {
      kept = result.current.add('owl', '2026-11-02', 'new');
    });
    expect(kept).toBe(true);
    expect(result.current.notes).toHaveLength(2);
    expect(s.saved.at(-1)).toHaveLength(2);
  });

  it('keeps nothing for an empty note, and forgets everything on reset', async () => {
    const s = store([{ id: 'a', speciesId: 'owl', date: '2026-11-01', text: 'old' }]);
    const { result } = await renderHook(() => useFieldNotes(s));
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    await act(async () => {
      expect(result.current.add('owl', '2026-11-02', '  ')).toBe(false);
    });
    await act(async () => result.current.reset());
    expect(result.current.notes).toEqual([]);
  });
});

// T-348: a photo is copied in under the note's id, and only for a note that is kept.
describe('useFieldNotes with a photo', () => {
  it('keeps the photo by file name, and copies nothing for a note that is refused', async () => {
    const s = store();
    const photos = { keep: jest.fn((_uri: string, id: string) => `${id}.jpg`), uri: (n: string) => n, clear: jest.fn() };
    const { result } = await renderHook(() => useFieldNotes(s, photos));
    await act(async () => {
      expect(result.current.add('owl', '2026-11-02', '   ', 'file:///cache/a.jpg')).toBe(false);
    });
    expect(photos.keep).not.toHaveBeenCalled();
    await act(async () => {
      expect(result.current.add('owl', '2026-11-02', 'Heard it', 'file:///cache/a.jpg')).toBe(true);
    });
    const note = result.current.notes[0];
    expect(photos.keep).toHaveBeenCalledWith('file:///cache/a.jpg', note.id);
    expect(note.photo).toBe(`${note.id}.jpg`);
  });
});
