import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import type { OfflinePack } from './offlinePack';
import type { SpeciesContent } from './species/content';
import type { Species } from './species/types';
import {
  catalogueRowToSpecies,
  contentRowToContent,
  presenceRowToPresence,
  type RegionPresence,
  type SpeciesContentRow,
  type SpeciesRepository,
  type SpeciesSummary,
} from './speciesRepository';
import { FallbackSpeciesRepository } from './speciesRepositoryFactory';
import { commonNameFor } from './species/localized';

// Playing from the saved county (T-257). The pack holds the server's own rows (T-256), so the
// same converters build the same species. Photos point at the saved thumbnails on the phone; a
// species without one shows its group glyph rather than a remote image that cannot load offline.

export class PackSpeciesRepository implements SpeciesRepository {
  private built: { species: Species[]; byId: Map<string, Species> } | null = null;
  /** Per language, read once (T-322 · review B-32): a launch reads only the pack's index. */
  private readonly texts = new Map<string, Promise<Map<string, SpeciesContentRow>>>();

  constructor(
    private readonly pack: OfflinePack,
    private readonly thumbUri: (speciesId: string) => string,
    /** A language's text file (version 2); without it, the pack's inline text (version 1, tests). */
    private readonly readContent?: (locale: string) => Promise<string | null>,
  ) {}

  /** The species, converted on first use rather than at construction. */
  private catalogue() {
    if (this.built === null) {
      const species = this.pack.catalogue.map((row) => {
        const s = catalogueRowToSpecies(row, this.pack.locale);
        const { photo, ...rest } = s;
        if (!photo || !(row.id in this.pack.thumbs)) return rest;
        return { ...rest, photo: { ...photo, url: this.thumbUri(row.id) } };
      });
      this.built = { species, byId: new Map(species.map((sp) => [sp.id, sp])) };
    }
    return this.built;
  }

  private textsIn(locale: string): Promise<Map<string, SpeciesContentRow>> {
    let loaded = this.texts.get(locale);
    if (!loaded) {
      loaded = this.loadTexts(locale);
      this.texts.set(locale, loaded);
    }
    return loaded;
  }

  private async loadTexts(locale: string): Promise<Map<string, SpeciesContentRow>> {
    let rows: SpeciesContentRow[] = [];
    if (this.readContent) {
      try {
        const json = await this.readContent(locale);
        const parsed: unknown = json ? JSON.parse(json) : [];
        rows = Array.isArray(parsed) ? (parsed as SpeciesContentRow[]) : [];
      } catch {
        rows = []; // a broken file is no text, never an error on the card
      }
    } else {
      rows = (this.pack.content ?? []).filter((c) => c.locale === locale);
    }
    return new Map(rows.map((r) => [r.species_id, r]));
  }

  private async text(speciesId: string, locale: string) {
    return (await this.textsIn(locale)).get(speciesId);
  }

  private county(regionId: string): void {
    if (regionId !== this.pack.regionId) throw new Error(`no offline pack for ${regionId}`);
  }

  async getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    const row = (await this.text(speciesId, locale)) ?? (await this.text(speciesId, 'en'));
    return row ? contentRowToContent(row) : null;
  }

  async getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    const row = await this.text(speciesId, locale);
    return row ? contentRowToContent(row) : null;
  }

  async regionPresence(regionId: string): Promise<RegionPresence[]> {
    this.county(regionId);
    return this.pack.presence.map(presenceRowToPresence);
  }

  async describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]> {
    const { byId } = this.catalogue();
    const [own, english] = await Promise.all([this.textsIn(locale), this.textsIn('en')]);
    return ids.flatMap((id) => {
      const species = byId.get(id);
      if (!species) return [];
      const row = own.get(id) ?? english.get(id);
      return [{ species, commonName: commonNameFor(species, locale), detail: row?.when_how ?? null }];
    });
  }

  async regionCatalogue(regionId: string, _locale: Locale): Promise<Species[]> {
    this.county(regionId);
    return this.catalogue().species;
  }
}

/**
 * The app's species source when a Full Game owner has a saved pack. Offline: the pack, then the
 * bundled set; the server is not tried, since each attempt would only wait for a network error.
 * Online: the server, then the pack, then the bundled set.
 */
export function composeRepository({
  online,
  bundled,
  pack,
  thumbUri,
  readContent,
  offline,
}: {
  online: SpeciesRepository;
  bundled: SpeciesRepository;
  pack: OfflinePack;
  thumbUri: (speciesId: string) => string;
  /** A language's text file of the pack (T-322). */
  readContent?: (locale: string) => Promise<string | null>;
  offline: boolean;
}): SpeciesRepository {
  const saved = new FallbackSpeciesRepository(
    new PackSpeciesRepository(pack, thumbUri, readContent),
    bundled,
  );
  return offline ? saved : new FallbackSpeciesRepository(online, saved);
}
