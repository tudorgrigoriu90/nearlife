// "a" or "an" before an English species name (T-371): the catch screen said "You caught Great
// Tit!". Chosen by sound, from the spelling: a vowel letter takes "an", except where it is
// pronounced as a consonant ("a Eurasian", "a Ural", "a one-flowered").
const CONSONANT_SOUND = /^(eu|ew|uni|ura|uro|use|usu|uti|one|once)/i;

export function withIndefiniteArticle(name: string): string {
  const vowel = /^[aeiou]/i.test(name) && !CONSONANT_SOUND.test(name);
  return `${vowel ? 'an' : 'a'} ${name}`;
}
