import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import type { SpeciesContent } from './species/content';
import type { Species } from './species/types';
import type {
  LocalizedSpecies,
  RegionPresence,
  SpeciesRepository,
  SpeciesSummary,
} from './speciesRepository';

// County data kept on the phone (T-275 · review B-20). A county's presence (~3,000 rows) and its
// catalogue (~3,000 rows, per language) were downloaded on every launch: about 0.4 MB compressed
// each time, which on Supabase's free 5 GB a month is the first limit the app would reach
// (invariant #7). Now each is saved with the server's data version, and a launch asks only for the
// version (one tiny request); the county is downloaded again only when the version changed.
//
// It is also what keeps a county on screen without a connection (B-14): offline, the saved county
// is served; with nothing saved, the read fails and the screen says so, never shows another
// county's species.

export interface CacheFiles {
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryCacheFiles implements CacheFiles {
  private files = new Map<string, string>();
  async read(name: string) {
    return this.files.get(name) ?? null;
  }
  async write(name: string, text: string) {
    this.files.set(name, text);
  }
  async clear() {
    this.files.clear();
  }
}

interface Entry<T> {
  version: string;
  data: T;
}

export class CachingSpeciesRepository implements SpeciesRepository {
  private versionPromise: Promise<string> | null = null;

  constructor(
    private readonly inner: SpeciesRepository,
    private readonly files: CacheFiles,
    /** The server's data version (public.data_version()). */
    private readonly serverVersion: () => Promise<string>,
  ) {}

  /** One version request per app session, shared by every county read. */
  private version(): Promise<string> {
    this.versionPromise ??= this.serverVersion().catch((e: unknown) => {
      this.versionPromise = null; // a failed check is retried next time
      throw e;
    });
    return this.versionPromise;
  }

  private async saved<T>(name: string): Promise<Entry<T> | null> {
    try {
      const raw = await this.files.read(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Entry<T>;
      return typeof parsed?.version === 'string' && parsed.data !== undefined ? parsed : null;
    } catch {
      return null; // a corrupt or unreadable file is a missing one
    }
  }

  private async cached<T>(name: string, load: () => Promise<T>): Promise<T> {
    const saved = await this.saved<T>(name);
    let version: string;
    try {
      version = await this.version();
    } catch (e) {
      if (saved) return saved.data;
      throw e;
    }
    if (saved?.version === version) return saved.data;
    try {
      const data = await load();
      await this.files.write(name, JSON.stringify({ version, data })).catch(() => undefined);
      return data;
    } catch (e) {
      if (saved) return saved.data;
      throw e;
    }
  }

  regionPresence(regionId: string): Promise<RegionPresence[]> {
    return this.cached(`presence.${regionId}`, () => this.inner.regionPresence(regionId));
  }

  regionCatalogue(regionId: string, locale: Locale): Promise<Species[]> {
    return this.cached(`catalogue.${regionId}.${locale}`, () =>
      this.inner.regionCatalogue(regionId, locale),
    );
  }

  listSpecies(locale: Locale): Promise<LocalizedSpecies[]> {
    return this.inner.listSpecies(locale);
  }

  getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    return this.inner.getContent(speciesId, locale);
  }

  getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    return this.inner.getContentInLocale(speciesId, locale);
  }

  describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]> {
    return this.inner.describeSpecies(ids, locale);
  }
}
