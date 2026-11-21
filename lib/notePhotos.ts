import { Directory, File, Paths } from 'expo-file-system';

// Photos on field notes (T-348 · review F-07): copied into the app's own folder, so they outlive the
// picker's temporary file, and never uploaded. Account deletion removes the whole folder (App's
// eraseDevice). Notes hold only the file name.

const ROOT = 'notes';

export interface NotePhotoFiles {
  /** Copy the picked photo in; its file name in the folder, or null when it could not be kept. */
  keep(sourceUri: string, noteId: string): string | null;
  /** Where a kept photo is, to show it. */
  uri(name: string): string;
  /** Remove every note photo (account deletion). */
  clear(): void;
}

export class ExpoNotePhotoFiles implements NotePhotoFiles {
  private dir(): Directory {
    const dir = new Directory(Paths.document, ROOT);
    if (!dir.exists) dir.create({ intermediates: true });
    return dir;
  }

  keep(sourceUri: string, noteId: string): string | null {
    try {
      const ext = /\.(png|webp|jpeg|jpg)$/i.exec(sourceUri)?.[1]?.toLowerCase() ?? 'jpg';
      const name = `${noteId.replace(/[^A-Za-z0-9_-]/g, '-')}.${ext}`;
      const target = new File(this.dir(), name);
      if (target.exists) target.delete();
      new File(sourceUri).copy(target);
      return name;
    } catch {
      return null; // a note is still kept without its photo
    }
  }

  uri(name: string): string {
    return new File(this.dir(), name).uri;
  }

  clear(): void {
    try {
      const dir = new Directory(Paths.document, ROOT);
      if (dir.exists) dir.delete();
    } catch {
      // Best-effort, like the rest of the device erase.
    }
  }
}
