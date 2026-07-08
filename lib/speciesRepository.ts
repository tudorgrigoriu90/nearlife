import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from './i18n';
import { KRONOBERG_SPECIES } from './species/kronoberg';
import { commonNameFor, contentFor } from './species/localized';
import type { SpeciesContent } from './species/content';
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
  getContent(speciesId: string, locale: Locale): Promise<SpeciesContent | null>;
  /** Per-region presence (from `species_presence`); drives This Week + the notification engine. */
  regionPresence(regionId: string): Promise<RegionPresence[]>;
}

/** The bundled curated data (default source until the app reads from the DB). */
export class HardcodedSpeciesRepository implements SpeciesRepository {
  constructor(private readonly species: Species[] = KRONOBERG_SPECIES) {}

  async listSpecies(locale: Locale): Promise<LocalizedSpecies[]> {
    return this.species.map((species) => ({ species, commonName: commonNameFor(species, locale) }));
  }

  async getContent(speciesId: string, locale: Locale): Promise<SpeciesContent | null> {
    return contentFor(speciesId, locale) ?? null;
  }

  // The bundled set is Kronoberg-only; presence is each species' curated active window.
  async regionPresence(_regionId: string): Promise<RegionPresence[]> {
    return this.species.map((s) => ({ speciesId: s.id, activeMonths: s.activeMonths, occurrences: 0 }));
  }
}

// ── Supabase-backed source ───────────────────────────────────────────────────

export interface SpeciesRow {
  id: string;
  scientific_name: string;
  common_name: string;
  category: SpeciesCategory;
  rarity: Rarity;
  active_months: number[];
}

export interface SpeciesContentRow {
  species_id: string;
  locale: string;
  common_name: string | null;
  fact: string;
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
    commonName: row.common_name,
    category: row.category,
    rarity: row.rarity,
    activeMonths: [...row.active_months].sort((a, b) => a - b) as Month[],
  };
}

export function contentRowToContent(row: SpeciesContentRow): SpeciesContent {
  return {
    speciesId: row.species_id,
    fact: row.fact,
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

  async getContent(speciesId: string, locale: Locale): Promise<SpeciesContent | null> {
    // Requested locale, falling back to English if the locale has no row (mirrors contentFor).
    const row =
      (await this.gateway.fetchContent(speciesId, locale)) ??
      (locale === 'en' ? null : await this.gateway.fetchContent(speciesId, 'en'));
    return row ? contentRowToContent(row) : null;
  }

  async regionPresence(regionId: string): Promise<RegionPresence[]> {
    return (await this.gateway.fetchPresence(regionId)).map(presenceRowToPresence);
  }
}

/** supabase-js adapter for `SpeciesGateway` (reads are public via RLS). */
export class SupabaseSpeciesGateway implements SpeciesGateway {
  constructor(private readonly client: SupabaseClient) {}

  async fetchSpecies(): Promise<SpeciesRow[]> {
    const { data, error } = await this.client
      .from('species')
      .select('id,scientific_name,common_name,category,rarity,active_months');
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
    const { data, error } = await this.client
      .from('species_presence')
      .select('species_id,active_months,occurrences')
      .eq('region_id', regionId);
    if (error) throw new Error(`species_presence fetch failed: ${error.message}`);
    return (data ?? []) as PresenceRow[];
  }
}
