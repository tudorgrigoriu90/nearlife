import type { Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import type { CatalogueRow, PresenceRow, SpeciesContentRow } from './speciesRepository';

// The offline county pack (T-256): what a Full Game owner keeps on the phone to play without a
// connection. Rows are kept exactly as the server sends them, so the offline repository (T-257)
// reuses the same converters as the online one and cannot drift from it.
//
// Kept small on purpose (Director: "sizing at a minimum"): card text in the app language, English
// only where that is missing, the second language if one is chosen, and the 200 px WebP thumbnails
// (T-255, ~4.5 KB each) instead of card photos. A refresh downloads only photos that changed.

// Version 2 (T-322 · review B-32): the pack file is a small index (catalogue, presence, thumbs);
// card text lives in one file per language, read when a card first opens. Version 1 held the text
// inline, so every launch read and parsed all of it; a version-1 pack is split once on load.
export const PACK_VERSION = 2;

export interface OfflinePack {
  version: typeof PACK_VERSION;
  regionId: string;
  locale: Locale;
  secondaryLocale: ContentLocale | null;
  /** ISO time of the download, shown as "saved on …". */
  savedAt: string;
  catalogue: CatalogueRow[];
  presence: PresenceRow[];
  /** Version 1 kept card text here; version 2 keeps it in per-language files (`contentLocales`). */
  content?: SpeciesContentRow[];
  /** The languages with a text file beside the index (version 2). */
  contentLocales?: string[];
  /** speciesId → the photo its saved thumbnail was made from; only species with a saved file. */
  thumbs: Record<string, string>;
}

export interface ThumbRow {
  species_id: string;
  thumb_url: string | null;
  thumb_source: string | null;
}

/** The server reads a download needs (SupabaseSpeciesGateway implements them). */
export interface PackSource {
  fetchRegionCatalogue(regionId: string, locale: string): Promise<CatalogueRow[]>;
  fetchPresence(regionId: string): Promise<PresenceRow[]>;
  fetchFullContent(ids: string[], locales: string[]): Promise<SpeciesContentRow[]>;
  fetchThumbs(ids: string[]): Promise<ThumbRow[]>;
}

/** Where the pack lives on the phone (lib/packFiles.ts; a fake in tests). */
export interface PackFiles {
  readPack(): Promise<string | null>;
  writePack(json: string): Promise<void>;
  /** One language's card text (version 2). */
  readContent(locale: string): Promise<string | null>;
  writeContent(locale: string, json: string): Promise<void>;
  hasThumb(speciesId: string): boolean;
  downloadThumb(url: string, speciesId: string): Promise<void>;
  deleteThumb(speciesId: string): void;
  /** Species ids of every saved thumbnail, including any an interrupted download left. */
  listThumbs(): string[];
  thumbUri(speciesId: string): string;
  clear(): void;
  /** Space the pack takes on the phone. */
  sizeBytes(): number;
}

export interface PackTarget {
  regionId: string;
  locale: Locale;
  secondaryLocale: ContentLocale | null;
}

export interface PackProgress {
  step: 'text' | 'photos';
  done: number;
  total: number;
}

/** Photos downloaded at once: quick on a phone connection without hogging it. */
const PARALLEL_DOWNLOADS = 4;

export async function loadPack(files: PackFiles): Promise<OfflinePack | null> {
  try {
    const text = await files.readPack();
    if (!text) return null;
    const pack = JSON.parse(text) as Omit<OfflinePack, 'version'> & { version: number };
    if (!Array.isArray(pack.catalogue)) return null;
    if (pack.version === PACK_VERSION) return pack as OfflinePack;
    // A version-1 pack: split its text out once, rather than make its owner download again.
    if (pack.version === 1 && Array.isArray(pack.content)) {
      return await writeSplit(files, { ...pack, version: PACK_VERSION }, pack.content);
    }
    return null;
  } catch {
    return null;
  }
}

/** Text files first, the index last: a failure part way leaves the previous index whole. */
async function writeSplit(
  files: PackFiles,
  pack: OfflinePack,
  content: SpeciesContentRow[],
): Promise<OfflinePack> {
  const byLocale = new Map<string, SpeciesContentRow[]>();
  for (const row of content) byLocale.set(row.locale, [...(byLocale.get(row.locale) ?? []), row]);
  for (const [locale, rows] of byLocale) await files.writeContent(locale, JSON.stringify(rows));
  const { content: _inline, ...rest } = pack;
  const index: OfflinePack = { ...rest, contentLocales: [...byLocale.keys()] };
  await files.writePack(JSON.stringify(index));
  return index;
}

/**
 * Download (or refresh) the pack for `target`. The pack file is written last, so a failure part
 * way leaves the previous pack whole; photos already saved are reused on the next try.
 */
export async function downloadPack(
  source: PackSource,
  files: PackFiles,
  target: PackTarget,
  onProgress?: (progress: PackProgress) => void,
  now: Date = new Date(),
): Promise<OfflinePack> {
  onProgress?.({ step: 'text', done: 0, total: 1 });
  const previous = await loadPack(files);
  const [catalogue, presence] = await Promise.all([
    source.fetchRegionCatalogue(target.regionId, target.locale),
    source.fetchPresence(target.regionId),
  ]);
  const ids = catalogue.map((r) => r.id);

  const locales = [
    target.locale,
    ...(target.secondaryLocale && target.secondaryLocale !== target.locale
      ? [target.secondaryLocale]
      : []),
  ];
  const content = await source.fetchFullContent(ids, locales);
  if (target.locale !== 'en') {
    const covered = new Set(
      content.filter((c) => c.locale === target.locale).map((c) => c.species_id),
    );
    const missing = ids.filter((id) => !covered.has(id));
    if (missing.length > 0) content.push(...(await source.fetchFullContent(missing, ['en'])));
  }
  onProgress?.({ step: 'text', done: 1, total: 1 });

  const wanted = (await source.fetchThumbs(ids)).filter(
    (t): t is ThumbRow & { thumb_url: string; thumb_source: string } =>
      !!t.thumb_url && !!t.thumb_source,
  );
  const thumbs: Record<string, string> = {};
  const toFetch = wanted.filter((t) => {
    const current =
      files.hasThumb(t.species_id) && previous?.thumbs[t.species_id] === t.thumb_source;
    if (current) thumbs[t.species_id] = t.thumb_source;
    return !current;
  });
  let done = 0;
  onProgress?.({ step: 'photos', done, total: toFetch.length });
  const queue = [...toFetch];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      try {
        await files.downloadThumb(t.thumb_url, t.species_id);
        thumbs[t.species_id] = t.thumb_source;
      } catch {
        // Left out of this pack: the card shows the group glyph offline, and the next refresh retries.
      }
      done += 1;
      onProgress?.({ step: 'photos', done, total: toFetch.length });
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));

  // Photos of species that left the county, or left over from an interrupted download, go.
  for (const id of files.listThumbs()) if (!(id in thumbs)) files.deleteThumb(id);

  return writeSplit(
    files,
    {
      version: PACK_VERSION,
      regionId: target.regionId,
      locale: target.locale,
      secondaryLocale: target.secondaryLocale,
      savedAt: now.toISOString(),
      catalogue,
      presence,
      thumbs,
    },
    content,
  );
}
