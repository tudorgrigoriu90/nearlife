import type { createTranslator } from './i18n';
import { isCommercialUseAllowed, type MediaLicense } from './species/media';

// Bird song (T-246): one shortened recording per bird, sourced and hosted by the pipeline
// (T-245, `species_sounds`). The licence guard mirrors photos: a recorded miss or anything outside
// CC0 / CC-BY / CC-BY-SA never plays.

/** A row of `public.species_sounds`. */
export interface SoundRow {
  species_id: string;
  url: string | null;
  source_url: string | null;
  author: string | null;
  license: string | null;
}

export interface SpeciesSound {
  speciesId: string;
  url: string;
  license: MediaLicense;
  author: string;
  /** The iNaturalist observation, which shows the recordist and licence. */
  sourceUrl: string;
}

export function soundRowToSound(row: SoundRow): SpeciesSound | undefined {
  if (!row.url || !row.license || !isCommercialUseAllowed(row.license)) return undefined;
  return {
    speciesId: row.species_id,
    url: row.url,
    license: row.license as MediaLicense,
    author: row.author || 'Unknown',
    sourceUrl: row.source_url || row.url,
  };
}

/** The credit line. "Shortened" is the change notice CC-BY asks for: the pipeline cuts a clip. */
export function soundCredit(sound: SpeciesSound, tr: ReturnType<typeof createTranslator>): string {
  return tr('card.songCredit', { author: sound.author, license: sound.license });
}

export interface SoundSource {
  soundFor(speciesId: string): Promise<SpeciesSound | undefined>;
}

/**
 * A source that asks once per species. Answers, "no recording" included, are kept for the session;
 * a failed request is not, so a card opened offline can still find its song later.
 */
export function cachedSoundSource(fetchRow: (speciesId: string) => Promise<SoundRow | null>): SoundSource {
  const known = new Map<string, SpeciesSound | undefined>();
  return {
    async soundFor(speciesId) {
      if (known.has(speciesId)) return known.get(speciesId);
      try {
        const row = await fetchRow(speciesId);
        const sound = row ? soundRowToSound(row) : undefined;
        known.set(speciesId, sound);
        return sound;
      } catch {
        return undefined;
      }
    },
  };
}

/** The minimal Supabase surface the sound source uses (a fake in tests). */
export interface SoundClient {
  from(table: 'species_sounds'): {
    select(columns: string): {
      eq(
        column: 'species_id',
        value: string,
      ): { maybeSingle(): PromiseLike<{ data: SoundRow | null; error: unknown }> };
    };
  };
}

/** `species_sounds` is public-read (migration 0027), so no session is needed. */
export function supabaseSoundSource(client: SoundClient): SoundSource {
  return cachedSoundSource(async (speciesId) => {
    const { data, error } = await client
      .from('species_sounds')
      .select('species_id,url,source_url,author,license')
      .eq('species_id', speciesId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}
