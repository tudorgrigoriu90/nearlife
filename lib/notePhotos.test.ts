// T-348: note photos on the phone, against an in-memory stand-in for expo-file-system.
jest.mock('expo-file-system', () => {
  const store = new Map<string, string>();
  const dirs = new Set<string>();
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return dirs.has(this.uri);
    }
    create() {
      dirs.add(this.uri);
    }
    delete() {
      for (const k of [...store.keys()]) if (k.startsWith(`${this.uri}/`)) store.delete(k);
      dirs.delete(this.uri);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return store.has(this.uri);
    }
    delete() {
      store.delete(this.uri);
    }
    copy(to: File) {
      if (!store.has(this.uri)) throw new Error('no such file');
      store.set(to.uri, store.get(this.uri) as string);
    }
  }
  return { Directory, File, Paths: { document: new Directory('file:///doc') }, __store: store };
});

import { ExpoNotePhotoFiles } from './notePhotos';

const fs = jest.requireMock('expo-file-system') as { __store: Map<string, string> };

describe('note photos', () => {
  it('copies the picked photo into the notes folder under the note id', () => {
    fs.__store.set('file:///cache/ImagePicker/abc.jpg', 'pixels');
    const files = new ExpoNotePhotoFiles();
    expect(files.keep('file:///cache/ImagePicker/abc.jpg', 'n1')).toBe('n1.jpg');
    expect(fs.__store.get('file:///doc/notes/n1.jpg')).toBe('pixels');
    expect(files.uri('n1.jpg')).toBe('file:///doc/notes/n1.jpg');
  });

  it('keeps nothing when the source is gone, and the folder goes with the account', () => {
    const files = new ExpoNotePhotoFiles();
    expect(files.keep('file:///cache/missing.jpg', 'n2')).toBeNull();
    fs.__store.set('file:///cache/x.png', 'p');
    files.keep('file:///cache/x.png', 'n3');
    files.clear();
    expect([...fs.__store.keys()].filter((k) => k.startsWith('file:///doc/notes/'))).toEqual([]);
  });
});
