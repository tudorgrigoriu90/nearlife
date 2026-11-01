// Species names as titles (T-236). Many languages write a species name in lower case in running
// text (Swedish "gräsand"), and the catalogue keeps names exactly as their sources write them.
// Wherever the app shows a name as a title or list heading it starts with a capital; the rest is
// left untouched, so "större hackspett" becomes "Större hackspett", not "Större Hackspett".

/** The name with its first letter upper-cased for `locale` (Turkish i → İ); unchanged otherwise. */
export function asTitleName(name: string, locale?: string): string {
  if (!name) return name;
  const first = String.fromCodePoint(name.codePointAt(0)!);
  return first.toLocaleUpperCase(locale) + name.slice(first.length);
}
