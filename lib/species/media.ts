// Species media / photo model (T-118). One hero photo per species, language-independent (one
// set serves all locales). Licensing rules: DATA-SOURCING-LICENSING.md §5 — only CC0 / CC-BY /
// CC-BY-SA (commercial OK with attribution); CC-BY-NC and ND are excluded; images are kept
// unmodified. Actual photos are sourced in T-119; until then the UI falls back to the category
// emoji. This module is the schema + attribution + license guard the sourcing and UI consume.

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

/** Human-readable credit line for the About/card attribution surface. */
export function attributionFor(media: SpeciesMedia): string {
  return `Photo: ${media.author} · ${media.license} · via Wikimedia Commons`;
}

/** The primary photo for a species (or the first, or null if none sourced yet). */
export function primaryPhoto(media: SpeciesMedia[], speciesId: string): SpeciesMedia | null {
  const forSpecies = media.filter((m) => m.speciesId === speciesId);
  return forSpecies.find((m) => m.isPrimary) ?? forSpecies[0] ?? null;
}

/**
 * Sourced photos for the Kronoberg set. Empty until T-119 populates it from Wikimedia Commons
 * (with real author/license/source per photo). The UI falls back to the category emoji while
 * this is empty, so an unsourced species is never broken.
 */
export const KRONOBERG_MEDIA: SpeciesMedia[] = [];
