// Species media / photo model (T-118). One hero photo per species, language-independent (one
// set serves all locales). Licensing rules: DATA-SOURCING-LICENSING.md §5 — only CC0 / CC-BY /
// CC-BY-SA (commercial OK with attribution); CC-BY-NC and ND are excluded; images are kept
// unmodified. Actual photos are sourced in T-119; until then the UI falls back to the category
// emoji. This module is the schema + attribution + license guard the sourcing and UI consume.

import { KRONOBERG_MEDIA as KRONOBERG_MEDIA_LIST } from './media.kronoberg';
import type { Species } from './types';

/** Licenses allowed for commercial use (with attribution). NC and ND are never allowed. */
export type MediaLicense = 'CC0' | 'CC-BY' | 'CC-BY-SA';

export const ALLOWED_LICENSES: MediaLicense[] = ['CC0', 'CC-BY', 'CC-BY-SA'];

export interface SpeciesMedia {
  speciesId: string;
  /** Image URL (Supabase Storage or bundled asset). */
  url: string;
  license: MediaLicense;
  author: string;
  /** Link to the original (e.g. the Wikimedia Commons file page). */
  sourceUrl: string;
  /** The card hero image when a species has more than one photo. */
  isPrimary: boolean;
}

/** True if the license permits commercial use (all of ALLOWED_LICENSES do). */
export function isCommercialUseAllowed(license: string): boolean {
  return (ALLOWED_LICENSES as string[]).includes(license);
}

/** Guard used when ingesting media — throws on an NC/ND/unknown license (never ships). */
export function assertAllowedLicense(media: SpeciesMedia): void {
  if (!isCommercialUseAllowed(media.license)) {
    throw new Error(`disallowed photo license for ${media.speciesId}: ${media.license}`);
  }
}

const PHOTO_SOURCES: [string, string][] = [
  ['wikimedia.org', 'Wikimedia Commons'],
  ['wikipedia.org', 'Wikimedia Commons'],
  ['inaturalist.org', 'iNaturalist'],
];

/**
 * The platform a photo came from, by its source page's host (T-220: Wikimedia or iNaturalist).
 * Parsed with a pattern, not `URL`: React Native's URL polyfill does not implement `hostname`.
 */
export function photoSourceName(sourceUrl: string): string | null {
  const host = /^https?:\/\/([^/?#:]+)/i.exec(sourceUrl)?.[1]?.toLowerCase();
  if (!host) return null;
  return PHOTO_SOURCES.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? null;
}

/** Human-readable credit line for the About/card attribution surface. */
export function attributionFor(media: SpeciesMedia): string {
  const via = photoSourceName(media.sourceUrl);
  return `Photo: ${media.author} · ${media.license}${via ? ` · via ${via}` : ''}`;
}

/** The primary photo for a species (or the first, or null if none sourced yet). */
export function primaryPhoto(media: SpeciesMedia[], speciesId: string): SpeciesMedia | null {
  const forSpecies = media.filter((m) => m.speciesId === speciesId);
  return forSpecies.find((m) => m.isPrimary) ?? forSpecies[0] ?? null;
}

/**
 * The hero photo for a species: the bundled one for the curated 54 (hand-checked, works offline),
 * else the catalogue photo the database supplied (T-215), else null → category glyph.
 */
export function photoFor(species: Species): SpeciesMedia | null {
  return primaryPhoto(KRONOBERG_MEDIA_LIST, species.id) ?? species.photo ?? null;
}

/**
 * Sourced photos for the Kronoberg set (T-119) — generated into `media.kronoberg.ts` from Wikimedia
 * Commons (real author/license/source per photo), re-hosted on Supabase Storage. The UI falls back
 * to the category emoji when a species has no photo or the image fails to load, so a species is
 * never broken (including before the Storage upload runs). Regenerate with
 * `scripts/gen-kronoberg-media.ts` after re-sourcing.
 */
export { KRONOBERG_MEDIA } from './media.kronoberg';
