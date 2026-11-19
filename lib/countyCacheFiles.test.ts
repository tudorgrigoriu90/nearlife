jest.mock('expo-file-system', () => {
  const store = new Map<string, string>();
  const dirs = new Set<string>();
  const join = (parts: unknown[]) => parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
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
  }
  return { Directory, File, Paths: { cache: new Directory('file:///cache') }, __store: store };
});

import { ExpoCacheFiles } from './countyCacheFiles';

// T-333 · review I-17: the county cache's files (T-275), on a fake file system.
describe('ExpoCacheFiles', () => {
  it('reads nothing before a write, then the latest write', async () => {
    const files = new ExpoCacheFiles();
    expect(await files.read('catalogue.SWE.9_1.sv')).toBeNull();
    await files.write('catalogue.SWE.9_1.sv', '[1]');
    await files.write('catalogue.SWE.9_1.sv', '[1,2]');
    expect(await files.read('catalogue.SWE.9_1.sv')).toBe('[1,2]');
  });

  it('keeps a name from leaving its directory', async () => {
    const files = new ExpoCacheFiles();
    await files.write('../../escape', 'x');
    const { __store } = jest.requireMock('expo-file-system') as { __store: Map<string, string> };
    expect([...__store.keys()].every((k) => k.startsWith('file:///cache/county-cache/'))).toBe(true);
    expect([...__store.keys()].some((k) => k.includes('/../'))).toBe(false);
  });

  it('clears everything, and clearing twice is harmless', async () => {
    const files = new ExpoCacheFiles();
    await files.write('presence.SWE.9_1', '{}');
    await files.clear();
    await files.clear();
    expect(await files.read('presence.SWE.9_1')).toBeNull();
  });
});
