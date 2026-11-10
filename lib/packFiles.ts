import { Directory, File, Paths } from 'expo-file-system';
import type { PackFiles } from './offlinePack';

// Where the offline county pack lives (T-256): the app's document directory, which Android only
// clears when the app is uninstalled or its data is wiped. One JSON file plus one small WebP per
// species photo.

const ROOT = 'offline';
const PACK = 'pack.json';
const PACK_TMP = 'pack.json.tmp';

const fileName = (speciesId: string) => `${speciesId.replace(/[^A-Za-z0-9-]/g, '-')}.webp`;
const idOf = (name: string) => name.replace(/\.webp$/, '').replace(/^gbif-/, 'gbif:');

export class ExpoPackFiles implements PackFiles {
  private root(): Directory {
    const dir = new Directory(Paths.document, ROOT);
    if (!dir.exists) dir.create({ intermediates: true });
    return dir;
  }

  private thumbs(): Directory {
    const dir = new Directory(this.root(), 'thumbs');
    if (!dir.exists) dir.create({ intermediates: true });
    return dir;
  }

  async readPack(): Promise<string | null> {
    const file = new File(this.root(), PACK);
    return file.exists ? file.text() : null;
  }

  // Written to a temporary file and then moved, so a crash mid-write never leaves a broken pack.
  async writePack(json: string): Promise<void> {
    const tmp = new File(this.root(), PACK_TMP);
    if (tmp.exists) tmp.delete();
    tmp.create();
    tmp.write(json);
    const target = new File(this.root(), PACK);
    if (target.exists) target.delete();
    tmp.move(target);
  }

  hasThumb(speciesId: string): boolean {
    return new File(this.thumbs(), fileName(speciesId)).exists;
  }

  async downloadThumb(url: string, speciesId: string): Promise<void> {
    await File.downloadFileAsync(url, new File(this.thumbs(), fileName(speciesId)), { idempotent: true });
  }

  deleteThumb(speciesId: string): void {
    const file = new File(this.thumbs(), fileName(speciesId));
    if (file.exists) file.delete();
  }

  listThumbs(): string[] {
    return this.thumbs()
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => idOf(file.name));
  }

  thumbUri(speciesId: string): string {
    return new File(this.thumbs(), fileName(speciesId)).uri;
  }

  clear(): void {
    const dir = new Directory(Paths.document, ROOT);
    if (dir.exists) dir.delete();
  }

  sizeBytes(): number {
    const dir = new Directory(Paths.document, ROOT);
    return dir.exists ? (dir.size ?? 0) : 0;
  }
}
