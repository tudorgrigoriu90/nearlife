import { Directory, File, Paths } from 'expo-file-system';
import type { CacheFiles } from './countyCache';

// Where the county cache lives (T-275): the app's cache directory. Android may clear it under
// storage pressure, which only costs one download; nothing here is personal data.

const ROOT = 'county-cache';
const safe = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_');

export class ExpoCacheFiles implements CacheFiles {
  private root(): Directory {
    const dir = new Directory(Paths.cache, ROOT);
    if (!dir.exists) dir.create({ intermediates: true });
    return dir;
  }

  async read(name: string): Promise<string | null> {
    const file = new File(this.root(), `${safe(name)}.json`);
    return file.exists ? file.text() : null;
  }

  async write(name: string, text: string): Promise<void> {
    const file = new File(this.root(), `${safe(name)}.json`);
    if (file.exists) file.delete();
    file.create();
    file.write(text);
  }

  async clear(): Promise<void> {
    const dir = new Directory(Paths.cache, ROOT);
    if (dir.exists) dir.delete();
  }
}
