import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import type { OfflinePack } from './offlinePack';
import type { SpeciesContent } from './species/content';
import type { Species } from './species/types';
import {
  catalogueRowToSpecies,
  contentRowToContent,
  presenceRowToPresence,
  type LocalizedSpecies,
  type RegionPresence,
  type SpeciesRepository,
  type SpeciesSummary,
} from './speciesRepository';
import { FallbackSpeciesRepository } from './speciesRepositoryFactory';
import { commonNameFor } from './species/localized';

// Playing from the saved county (T-257). The pack holds the server's own rows (T-256), so the
// same converters build the same species. Photos point at the saved thumbnails on the phone; a
// species without one shows its group glyph rather than a remote image that cannot load offline.

export class PackSpeciesRepository implements SpeciesRepository {
  private readonly species: Species[];
  private readonly byId: Map<string, Species>;
  private readonly content: Map<string, OfflinePack['content'][number]>;

  constructor(
    private readonly pack: OfflinePack,
    thumbUri: (speciesId: string) => string,
  ) {
    this.species = pack.catalogue.map((row) => {
      const s = catalogueRowToSpecies(row, pack.locale);
      const { photo, ...rest } = s;
      if (!photo || !(row.id in pack.thumbs)) return rest;
      return { ...rest, photo: { ...photo, url: thumbUri(row.id) } };
    });
    this.byId = new Map(this.species.map((s) => [s.id, s]));
    // Indexed once: lists describe thousands of species, and a scan per lookup would be slow.
    this.content = new Map(pack.content.map((c) => [`${c.species_id}|${c.locale}`, c]));
  }

  private county(regionId: string): void {
    if (regionId !== this.pack.regionId) throw new Error(`no offline pack for ${regionId}`);
  }

  private text(speciesId: string, locale: string) {
    return this.content.get(`${speciesId}|${locale}`);
  }

  async listSpecies(locale: Locale): Promise<LocalizedSpecies[]> {
    return this.species.map((species) => ({ species, commonName: commonNameFor(species, locale) }));
  }

  async getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    const row = this.text(speciesId, locale) ?? this.text(speciesId, 'en');
    return row ? contentRowToContent(row) : null;
  }

  async getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    const row = this.text(speciesId, locale);
    return row ? contentRowToContent(row) : null;
  }

  async regionPresence(regionId: string): Promise<RegionPresence[]> {
    this.county(regionId);
    return this.pack.presence.map(presenceRowToPresence);
  }

  async describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]> {
    return ids.flatMap((id) => {
      const species = this.byId.get(id);
      if (!species) return [];
      const row = this.text(id, locale) ?? this.text(id, 'en');
      return [{ species, commonName: commonNameFor(species, locale), detail: row?.when_how ?? null }];
    });
  }

  async regionCatalogue(regionId: string, _locale: Locale): Promise<Species[]> {
    this.county(regionId);
    return this.species;
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
  offline,
}: {
  online: SpeciesRepository;
  bundled: SpeciesRepository;
  pack: OfflinePack;
  thumbUri: (speciesId: string) => string;
  offline: boolean;
}): SpeciesRepository {
  const saved = new FallbackSpeciesRepository(new PackSpeciesRepository(pack, thumbUri), bundled);
  return offline ? saved : new FallbackSpeciesRepository(online, saved);
}
