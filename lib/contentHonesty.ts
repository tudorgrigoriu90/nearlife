import type { ContentLocale } from './i18n/contentLocale';

// Copy-honesty enforcement (T-066 · invariant #1, GDD §3). All user-facing copy describes the
// season/behaviour — "active in your region this season" — and never claims the species is
// present at this moment ("here right now"). This module is the single source of truth for the
// banned real-time-presence phrases; the test (contentHonesty.test.ts) runs it across every
// species content field AND every i18n catalog string, in each live locale, so no string can
// overclaim presence without failing the build.
//
// Keyed by `ContentLocale` (T-153): dual display shows species content in the wider mother-tongue
// roster, and that content has to clear the same honesty bar as the primary — an unreviewed
// machine translation is exactly where an overclaim would slip in unnoticed.

/** Real-time-presence phrases that break the honesty rule, per locale (lower-case, substring). */
export const REALTIME_CLAIM_PHRASES: Partial<Record<ContentLocale, string[]>> = {
  en: ['right now', 'here now', 'here right now', 'currently here', 'near you now', 'at this moment'],
  sv: ['just nu', 'här nu', 'just här'],
  // Multi-word, like the English list: bare «الآن» ("now") is far too common to ban outright and
  // would flag honest seasonal copy. These are the real-time *presence* constructions.
  ar: ['هنا الآن', 'الآن هنا', 'حاليا هنا', 'حاليًا هنا', 'في هذه اللحظة', 'بالقرب منك الآن', 'موجود الآن'],
  so: ['halkan hadda', 'hadda halkan', 'hadda halkan joogaa'],
  fa: ['اینجا الان', 'الان اینجا', 'همین حالا اینجا', 'در حال حاضر اینجا', 'در این لحظه'],
  ti: ['ኣብዚ ሕጂ', 'ሕጂ ኣብዚ', 'ኣብዚ እዋን እዚ'],
  ckb: ['لێرە ئێستا', 'ئێستا لێرە', 'لەم ساتەدا'],
  tr: ['şu anda burada', 'burada şu anda', 'şimdi burada', 'şu an burada'],
  bs: ['ovdje sada', 'sada ovdje', 'upravo sada', 'trenutno ovdje'],
  sr: ['овде сада', 'сада овде', 'управо сада', 'тренутно овде'],
  sq: ['këtu tani', 'tani këtu', 'pikërisht tani', 'aktualisht këtu'],
  ru: ['здесь сейчас', 'сейчас здесь', 'прямо сейчас', 'в данный момент здесь'],
  uk: ['тут зараз', 'зараз тут', 'просто зараз', 'наразі тут'],
  ps: ['دلته اوس', 'اوس دلته', 'همدا اوس دلته'],
  kmr: ['li vir niha', 'niha li vir', 'vê gavê li vir'],
  th: ['ที่นี่ตอนนี้', 'ตอนนี้ที่นี่', 'ขณะนี้ที่นี่'],
  vi: ['ở đây ngay bây giờ', 'ngay bây giờ ở đây', 'hiện đang ở đây', 'lúc này ở đây'],
  am: ['እዚህ አሁን', 'አሁን እዚህ', 'በዚህ ቅጽበት'],
  pl: ['tutaj teraz', 'teraz tutaj', 'właśnie tutaj', 'w tej chwili tutaj'],
  de: ['jetzt hier', 'hier jetzt', 'gerade hier', 'im moment hier', 'derzeit hier'],
  fi: ['tässä juuri nyt', 'juuri nyt tässä', 'nyt täällä', 'täällä nyt'],
  da: ['her lige nu', 'lige nu her', 'her nu', 'netop nu'],
  hr: ['ovdje sada', 'sada ovdje', 'upravo sada', 'trenutno ovdje'],
  es: ['aquí ahora', 'ahora aquí', 'justo ahora', 'en este momento aquí', 'actualmente aquí'],
  nl: ['hier nu', 'nu hier', 'op dit moment hier', 'momenteel hier', 'nu ter plekke'],
  fr: ['ici maintenant', 'maintenant ici', 'ici en ce moment', 'en ce moment ici', 'actuellement ici'],
};

/**
 * Whether this locale has its own banned-phrase list.
 *
 * This matters more than it looks: `findRealtimeClaims` falls back to the **English** phrase list
 * for an unknown locale, and English substrings never match Arabic or Tigrinya text — so the check
 * would pass vacuously and report content as honest without having examined it. A locale must
 * therefore declare its own phrases before its content may ship; `contentHonesty.test.ts` fails
 * the build for any offerable locale missing them (T-153).
 */
export function hasHonestyPhrasesFor(locale: ContentLocale): boolean {
  return REALTIME_CLAIM_PHRASES[locale] !== undefined;
}

/** Banned phrases found in `text` for `locale` (case-insensitive). Empty = honest. */
export function findRealtimeClaims(text: string, locale: ContentLocale): string[] {
  const phrases = REALTIME_CLAIM_PHRASES[locale] ?? REALTIME_CLAIM_PHRASES.en ?? [];
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase));
}

/** True when `text` makes no real-time-presence claim for `locale`. */
export function isHonest(text: string, locale: ContentLocale): boolean {
  return findRealtimeClaims(text, locale).length === 0;
}
