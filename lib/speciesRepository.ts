import { parseHabitats } from './catchSpots';
import { GROUP_BY_TAXON } from './species/group';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import { KRONOBERG_SPECIES } from './species/kronoberg';
import { commonNameFor, contentFor, contentInLocale } from './species/localized';
import type { SpeciesContent } from './species/content';
import { isCommercialUseAllowed, type MediaLicense, type SpeciesMedia } from './species/media';
import type { Month, Rarity, Species, SpeciesCategory } from './species/types';

// Species data-access seam (T-057 / T-059). The screens read the catalogue + localized content
// through this interface instead of importing the hardcoded data directly, so the source can
// swap from the bundled Kronoberg set to the seeded Supabase tables (T-055) without touching UI.
// Mirrors the collection-store seam: a tested in-memory/hardcoded impl the app runs on today, and
// a Supabase impl (behind a tiny gateway) that reads the production tables when data is seeded.

export interface LocalizedSpecies {
  species: Species;
  /** Common name in the requested locale (English fallback). */
  commonName: string;
}

/** A species' presence in a region: the months it's recorded there + observation count (TSD §4). */
export interface RegionPresence {
  speciesId: string;
  activeMonths: number[];
  occurrences: number;
}

export interface SpeciesRepository {
  listSpecies(locale: Locale): Promise<LocalizedSpecies[]>;
  getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null>;
  /**
   * Content in exactly `locale`, with **no** English fallback — the mother-tongue half of dual
   * display (T-154). Falling back would show a user a third language they never chose.
   */
  getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null>;
  /** Per-region presence (from `species_presence`); drives This Week + the notification engine. */
  regionPresence(regionId: string): Promise<RegionPresence[]>;
  /**
   * Display data for exactly these species, in the given order (unknown ids are skipped): the
   * species, its name in `locale` (English, then the binomial, as fallbacks) and its "when & how"
   * line. For lists drawn from presence, where loading the whole catalogue would be wasteful (T-207).
   */
  describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]>;
  /**
   * Every species recorded in a county, most-observed first, named in `locale` where a name exists
   * (T-208). The Almanac's catalogue: the user's own county rather than an arbitrary slice of the
   * national 12k.
   */
  regionCatalogue(regionId: string, locale: Locale): Promise<Species[]>;
}

export interface SpeciesSummary {
  species: Species;
  commonName: string;
  /** "When & how to see it" in the locale, or null when there is no content row. */
  detail: string | null;
}

/** The bundled curated data (default source until the app reads from the DB). */
export class HardcodedSpeciesRepository implements SpeciesRepository {
  constructor(private readonly species: Species[] = KRONOBERG_SPECIES) {}

  async listSpecies(locale: Locale): Promise<LocalizedSpecies[]> {
    return this.species.map((species) => ({ species, commonName: commonNameFor(species, locale) }));
  }

  async getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    return contentFor(speciesId, locale) ?? null;
  }

  async getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    return contentInLocale(speciesId, locale) ?? null;
  }

  // The bundled set is Kronoberg-only; presence is each species' curated active window.
  async regionPresence(_regionId: string): Promise<RegionPresence[]> {
    return this.species.map((s) => ({ speciesId: s.id, activeMonths: s.activeMonths, occurrences: 0 }));
  }

  // The bundled set stands in for every county, as `regionPresence` does above.
  async regionCatalogue(_regionId: string, _locale: Locale): Promise<Species[]> {
    return [...this.species];
  }

  async describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]> {
    const byId = new Map(this.species.map((s) => [s.id, s]));
    return ids.flatMap((id) => {
      const species = byId.get(id);
      if (species === undefined) return [];
      return [{ species, commonName: commonNameFor(species, locale), detail: contentFor(id, locale)?.whenAndHow ?? null }];
    });
  }
}

// ── Supabase-backed source ───────────────────────────────────────────────────

export interface SpeciesRow {
  id: string;
  scientific_name: string;
  common_name: string | null;
  /** Null for GBIF groups with no catch minigame of their own (T-042 migration). */
  category: SpeciesCategory | null;
  rarity: Rarity;
  active_months: number[];
  taxon_group?: string | null;
}

/**
 * The minigame a species without a curated category plays (T-207). The catalogue keeps
 * `category` null for amphibians, reptiles, arachnids and molluscs, but every species must be
 * catchable — the card would otherwise crash on "Find it nearby". Mapped by how the animal moves:
 * frogs and lizards are approached by stealth, spiders are traced, slow molluscs are spotted and
 * framed. Anything still unknown falls back to the gentlest mechanic.
 */
const MINIGAME_BY_TAXON_GROUP: Record<string, SpeciesCategory> = {
  amphibian: 'mammal',
  reptile: 'mammal',
  arachnid: 'insect',
  mollusc: 'plant',
};

export function minigameCategory(row: Pick<SpeciesRow, 'category' | 'taxon_group'>): SpeciesCategory {
  if (row.category !== null && row.category !== undefined) return row.category;
  return MINIGAME_BY_TAXON_GROUP[row.taxon_group ?? ''] ?? 'plant';
}

/** A species' photo as the database stores it (`species_media`, T-202). */
export interface MediaRow {
  species_id: string;
  url: string | null;
  source_url: string | null;
  author: string | null;
  license: string | null;
}

/** A usable photo, or undefined — a recorded miss or a licence outside the allowed set never ships. */
export function mediaRowToPhoto(row: MediaRow): SpeciesMedia | undefined {
  if (!row.url || !row.license || !isCommercialUseAllowed(row.license)) return undefined;
  return {
    speciesId: row.species_id,
    url: row.url,
    license: row.license as MediaLicense,
    author: row.author || 'Unknown',
    sourceUrl: row.source_url || row.url,
    isPrimary: true,
  };
}

/** A row of `public.region_catalogue(region, loc)` (migrations 20261028000002 / 20261029000003). */
export interface CatalogueRow extends SpeciesRow {
  /** Name in the requested locale, else English, else null. */
  local_name: string | null;
  occurrences: number;
  photo_url?: string | null;
  photo_source_url?: string | null;
  photo_author?: string | null;
  photo_license?: string | null;
  /** Since T-057; absent from an older function. */
  catch_habitats?: string[] | null;
}

export function catalogueRowToSpecies(row: CatalogueRow, locale: string): Species {
  const base = speciesRowToSpecies(row);
  const photo = mediaRowToPhoto({
    species_id: row.id,
    url: row.photo_url ?? null,
    source_url: row.photo_source_url ?? null,
    author: row.photo_author ?? null,
    license: row.photo_license ?? null,
  });
  const catchHabitats = parseHabitats(row.catch_habitats);
  return {
    ...base,
    ...(row.local_name ? { names: { [locale]: row.local_name } } : {}),
    ...(photo ? { photo } : {}),
    ...(catchHabitats ? { catchHabitats } : {}),
  };
}

export interface ContentSummaryRow {
  species_id: string;
  locale: string;
  common_name: string | null;
  when_how: string;
}

export interface SpeciesContentRow {
  species_id: string;
  locale: string;
  common_name: string | null;
  /** Null for species with no Wikipedia article (T-146) — mission content still ships. */
  fact: string | null;
  when_how: string;
  give: string;
  protect: string;
}

export interface PresenceRow {
  species_id: string;
  active_months: number[];
  occurrences: number;
}

export function presenceRowToPresence(row: PresenceRow): RegionPresence {
  return {
    speciesId: row.species_id,
    activeMonths: [...row.active_months].sort((a, b) => a - b),
    occurrences: row.occurrences,
  };
}

export function speciesRowToSpecies(row: SpeciesRow): Species {
  return {
    id: row.id,
    scientificName: row.scientific_name,
    // Nullable since T-196: most GBIF species have no common name in any language. Falling
    // back to the binomial is honest *here* — it is the name we actually have, and the row
    // still records that no common name is known, which is what T-187 was protecting.
    commonName: row.common_name?.trim() || row.scientific_name,
    category: minigameCategory(row),
    ...(row.category == null && GROUP_BY_TAXON[row.taxon_group ?? '']
      ? { group: GROUP_BY_TAXON[row.taxon_group ?? ''] }
      : {}),
    rarity: row.rarity,
    activeMonths: [...row.active_months].sort((a, b) => a - b) as Month[],
  };
}

export function contentRowToContent(row: SpeciesContentRow): SpeciesContent {
  return {
    speciesId: row.species_id,
    // A null DB fact (no article, T-146) becomes an empty string in the domain object; the card
    // treats empty as "no fact" and hides the fact block while still showing the mission content.
    fact: row.fact ?? '',
    whenAndHow: row.when_how,
    give: row.give,
    protect: row.protect,
  };
}

/** The reads the Supabase repository needs — kept minimal so it is trivially fakeable. */
export interface SpeciesGateway {
  fetchSpecies(): Promise<SpeciesRow[]>;
  fetchContent(speciesId: string, locale: string): Promise<SpeciesContentRow | null>;
  fetchPresence(regionId: string): Promise<PresenceRow[]>;
  fetchSpeciesByIds(ids: string[]): Promise<SpeciesRow[]>;
  /** Name + "when & how" for these species in `locales` (the requested one and English). */
  fetchContentSummaries(ids: string[], locales: string[]): Promise<ContentSummaryRow[]>;
  fetchRegionCatalogue(regionId: string, locale: string): Promise<CatalogueRow[]>;
  fetchMediaByIds(ids: string[]): Promise<MediaRow[]>;
}

export class SupabaseSpeciesRepository implements SpeciesRepository {
  constructor(private readonly gateway: SpeciesGateway) {}

  async listSpecies(locale: Locale): Promise<LocalizedSpecies[]> {
    const rows = await this.gateway.fetchSpecies();
    return rows.map((row) => {
      const species = speciesRowToSpecies(row);
      // Localized name resolution mirrors the hardcoded path (English name is the base).
      return { species, commonName: commonNameFor(species, locale) };
    });
  }

  async getContent(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    // Requested locale, falling back to English if the locale has no row (mirrors contentFor).
    const row =
      (await this.gateway.fetchContent(speciesId, locale)) ??
      (locale === 'en' ? null : await this.gateway.fetchContent(speciesId, 'en'));
    return row ? contentRowToContent(row) : null;
  }

  async getContentInLocale(speciesId: string, locale: ContentLocale): Promise<SpeciesContent | null> {
    // Deliberately no English fallback — see the interface docs.
    const row = await this.gateway.fetchContent(speciesId, locale);
    return row ? contentRowToContent(row) : null;
  }

  async regionPresence(regionId: string): Promise<RegionPresence[]> {
    return (await this.gateway.fetchPresence(regionId)).map(presenceRowToPresence);
  }

  async describeSpecies(ids: string[], locale: Locale): Promise<SpeciesSummary[]> {
    if (ids.length === 0) return [];
    const locales = locale === 'en' ? ['en'] : [locale, 'en'];
    const [rows, content, media] = await Promise.all([
      this.gateway.fetchSpeciesByIds(ids),
      this.gateway.fetchContentSummaries(ids, locales),
      this.gateway.fetchMediaByIds(ids),
    ]);
    const photoById = new Map(
      media.flatMap((m) => {
        const photo = mediaRowToPhoto(m);
        return photo ? [[m.species_id, photo] as const] : [];
      }),
    );
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const contentFor = (id: string, loc: string) =>
      content.find((c) => c.species_id === id && c.locale === loc);
    return ids.flatMap((id) => {
      const row = rowById.get(id);
      if (row === undefined) return [];
      const base = speciesRowToSpecies(row);
      const own = contentFor(id, locale);
      const english = contentFor(id, 'en');
      const localName = own?.common_name?.trim() || english?.common_name?.trim();
      // Carry the name on the species too, so a card opened from this row is titled in the
      // reader's language (commonNameFor reads `names`).
      const photo = photoById.get(id);
      const species: Species = {
        ...base,
        ...(localName ? { names: { [locale]: localName } } : {}),
        ...(photo ? { photo } : {}),
      };
      return [
        {
          species,
          commonName: localName || base.commonName,
          detail: (own ?? english)?.when_how ?? null,
        },
      ];
    });
  }

  async regionCatalogue(regionId: string, locale: Locale): Promise<Species[]> {
    return (await this.gateway.fetchRegionCatalogue(regionId, locale)).map((row) =>
      catalogueRowToSpecies(row, locale),
    );
  }
}

/**
 * PostgREST returns at most 1,000 rows per request (Supabase's default `max_rows`) and says
 * nothing when it truncates. A county has ~3,700 presence rows, so a single request silently lost
 * most of them (found in T-207). Every list read pages until a short page.
 */
export const PAGE_SIZE = 1000;
/** Ids per `in.(...)` filter — keeps request URLs well under proxy limits. */
const IN_CHUNK = 150;

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function readAllPages<T>(page: (from: number, to: number) => Page<T>, what: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${what} fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function readInChunks<T>(ids: string[], read: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) out.push(...(await read(ids.slice(i, i + IN_CHUNK))));
  return out;
}

/** supabase-js adapter for `SpeciesGateway` (reads are public via RLS). */
export class SupabaseSpeciesGateway implements SpeciesGateway {
  constructor(private readonly client: SupabaseClient) {}

  async fetchSpecies(): Promise<SpeciesRow[]> {
    const { data, error } = await this.client
      .from('species')
      .select(SPECIES_COLUMNS)
      // Only species the noise filter ships (T-225). Presence is already limited by RLS; this
      // list reads the species table, which stays readable so a collected species' card loads.
      .eq('in_catalogue', true);
    if (error) throw new Error(`species fetch failed: ${error.message}`);
    return (data ?? []) as SpeciesRow[];
  }

  async fetchContent(speciesId: string, locale: string): Promise<SpeciesContentRow | null> {
    const { data, error } = await this.client
      .from('species_content')
      .select('species_id,locale,common_name,fact,when_how,give,protect')
      .eq('species_id', speciesId)
      .eq('locale', locale)
      .maybeSingle();
    if (error) throw new Error(`species_content fetch failed: ${error.message}`);
    return (data as SpeciesContentRow | null) ?? null;
  }

  async fetchPresence(regionId: string): Promise<PresenceRow[]> {
    // Ordered so pages are stable: without an order, PostgREST may repeat or skip rows across pages.
    return readAllPages<PresenceRow>(
      (from, to) =>
        this.client
          .from('species_presence')
          .select('species_id,active_months,occurrences')
          .eq('region_id', regionId)
          .order('species_id')
          .range(from, to),
      'species_presence',
    );
  }

  async fetchSpeciesByIds(ids: string[]): Promise<SpeciesRow[]> {
    return readInChunks(ids, (chunk) =>
      readAllPages<SpeciesRow>(
        (from, to) => this.client.from('species').select(SPECIES_COLUMNS).in('id', chunk).order('id').range(from, to),
        'species',
      ),
    );
  }

  async fetchContentSummaries(ids: string[], locales: string[]): Promise<ContentSummaryRow[]> {
    return readInChunks(ids, (chunk) =>
      readAllPages<ContentSummaryRow>(
        (from, to) =>
          this.client
            .from('species_content')
            .select('species_id,locale,common_name,when_how')
            .in('species_id', chunk)
            .in('locale', locales)
            .order('species_id')
            .range(from, to),
        'species_content',
      ),
    );
  }

  async fetchMediaByIds(ids: string[]): Promise<MediaRow[]> {
    return readInChunks(ids, (chunk) =>
      readAllPages<MediaRow>(
        (from, to) =>
          this.client
            .from('species_media')
            .select('species_id,url,source_url,author,license')
            .in('species_id', chunk)
            .order('species_id')
            .range(from, to),
        'species_media',
      ),
    );
  }

  async fetchRegionCatalogue(regionId: string, locale: string): Promise<CatalogueRow[]> {
    // The function orders by (occurrences desc, id) — a total order, so pages never overlap.
    return readAllPages<CatalogueRow>(
      (from, to) => this.client.rpc('region_catalogue', { region: regionId, loc: locale }).range(from, to),
      'region_catalogue',
    );
  }
}

const SPECIES_COLUMNS = 'id,scientific_name,common_name,category,rarity,active_months,taxon_group';
