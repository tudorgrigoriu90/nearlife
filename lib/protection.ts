import type { TranslationKey } from './i18n';
import { groupOf } from './species/group';
import type { Protection, Species } from './species/types';

// The card's protection line (T-337 · review F-01). What the Species Protection Ordinance forbids
// differs by level and by organism, so the wording does too:
//   birds, 4 §: harming, disturbing at the nest, taking eggs or nests;
//   animals at strict / reinforced / annex level, 4 a § and 5 a §: catching, harming, disturbing,
//     damaging breeding or resting places; at basic level, 6 §: catching, harming, collecting,
//     taking eggs, spawn, larvae or nests;
//   plants, fungi and lichens, 7 § and 8 §: picking, digging up, damaging; at limited level, 9 §:
//     uprooting, and picking to sell.
// Hunting and fishing are excepted (6 b §) and governed by their own laws, which the line says
// for birds, mammals and fish rather than implying they can never be taken.

export interface ProtectionLine {
  rule: TranslationKey;
  where: TranslationKey;
  extra?: TranslationKey;
}

export function protectionLine(
  level: Protection,
  species: Pick<Species, 'category' | 'group'>,
  local: boolean,
): ProtectionLine {
  const group = groupOf(species);
  const where: TranslationKey = local ? 'legal.where.county' : 'legal.where.sweden';
  if (group === 'bird') return { rule: 'legal.protected.bird', where, extra: 'legal.hunting' };
  if (group === 'plant' || group === 'fungus') {
    return { rule: level === 'limited' ? 'legal.protected.plantLimited' : 'legal.protected.plant', where };
  }
  const rule: TranslationKey = level === 'basic' || level === 'limited' ? 'legal.protected.animalBasic' : 'legal.protected.animal';
  if (group === 'mammal') return { rule, where, extra: 'legal.hunting' };
  if (group === 'fish') return { rule, where, extra: 'legal.fishing' };
  return { rule, where };
}
