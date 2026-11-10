// T-256: the pack's files on the phone, against an in-memory stand-in for expo-file-system.
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
      for (const d of [...dirs]) if (d === this.uri || d.startsWith(`${this.uri}/`)) dirs.delete(d);
    }
    list() {
      return [...store.keys()]
        .filter((k) => k.slice(0, k.lastIndexOf('/')) === this.uri)
        .map((k) => new File(k));
    }
    get size() {
      return [...store.entries()]
        .filter(([k]) => k.startsWith(`${this.uri}/`))
        .reduce((n, [, v]) => n + v.length, 0);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get name() {
      return this.uri.slice(this.uri.lastIndexOf('/') + 1);
    }
    get exists() {
      return store.has(this.uri);
    }
    create() {
      store.set(this.uri, '');
    }
    write(text: string) {
      store.set(this.uri, text);
    }
    async text() {
      return store.get(this.uri) ?? '';
    }
    delete() {
      store.delete(this.uri);
    }
    move(to: File) {
      store.set(to.uri, store.get(this.uri) ?? '');
      store.delete(this.uri);
    }
    static downloadFileAsync = jest.fn(async (url: string, to: File) => {
      store.set(to.uri, `bytes of ${url}`);
      return to;
    });
  }
  return { Directory, File, Paths: { document: new Directory('file:///doc') } };
});

import { ExpoPackFiles } from './packFiles';

describe('ExpoPackFiles', () => {
  it('writes and reads the pack, and clears everything', async () => {
    const files = new ExpoPackFiles();
    expect(await files.readPack()).toBeNull();
    await files.writePack('{"version":1}');
    await files.writePack('{"version":1,"b":2}');
    expect(await files.readPack()).toBe('{"version":1,"b":2}');
    expect(files.sizeBytes()).toBeGreaterThan(0);
    files.clear();
    expect(await files.readPack()).toBeNull();
    expect(files.sizeBytes()).toBe(0);
  });

  it('keeps one thumbnail per species, with a safe file name, and lists them back by id', async () => {
    const files = new ExpoPackFiles();
    await files.downloadThumb('https://x/thumbs/gbif-1.webp', 'gbif:1');
    await files.downloadThumb('https://x/thumbs/moose.webp', 'moose');
    expect(files.hasThumb('gbif:1')).toBe(true);
    expect(files.thumbUri('gbif:1')).toBe('file:///doc/offline/thumbs/gbif-1.webp');
    expect(files.listThumbs().sort()).toEqual(['gbif:1', 'moose']);
    files.deleteThumb('gbif:1');
    expect(files.hasThumb('gbif:1')).toBe(false);
    files.clear();
  });
});
