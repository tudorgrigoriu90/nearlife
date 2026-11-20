import { createTranslator, type Locale } from './i18n';
import type { ContentLocale } from './i18n/contentLocale';
import { attributionFor, photoFor } from './species/media';
import { commonNameFor } from './species/localized';
import type { Species } from './species/types';

// The species card as a shareable image (T-368 · review F-14): the words on it. Season-framed,
// never "here right now" (invariant #1); no upsell (invariant #4). The photo's licences (CC BY,
// CC BY-SA) require credit, so the credit line is drawn on the image itself: a shared picture
// travels without the card that would otherwise carry it.
export function shareCardLines(
  species: Species,
  locale: Locale,
  county: string | null,
): { name: string; season: string; credit: string | null; app: string } {
  const tr = createTranslator(locale);
  const photo = photoFor(species);
  return {
    name: commonNameFor(species, locale as ContentLocale),
    season: county ? tr('share.card.season', { county }) : tr('share.card.seasonSweden'),
    credit: photo ? attributionFor(photo, locale) : null,
    app: tr('share.card.app'),
  };
}
