// Generator: emits idempotent seed SQL for public.species + public.species_content from the
// curated Kronoberg data (the same data the app ships). Run: `npx tsx scripts/gen-species-seed.ts`.
// Output is applied to the DB via the Supabase connector and saved as a seed migration.
//
// Drives off CONTENT_BY_LOCALE / NAMES_BY_LOCALE rather than naming locales here (T-160). The
// original version imported en and sv explicitly, so the 36 locales T-154 added never reached the
// database — and `SupabaseSpeciesRepository.getContentInLocale` has no English fallback by design,
// so on the Supabase path the dual-language half rendered nothing. Iterating the registries means
// a new locale is seeded by the act of registering it; there is no second list to forget.
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import type { SpeciesContent } from '../lib/species/content';
import { CONTENT_BY_LOCALE, NAMES_BY_LOCALE } from '../lib/species/localized';
import type { ContentLocale } from '../lib/i18n/contentLocale';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const nq = (s: string | null | undefined) => (s == null ? 'null' : q(s));
const arr = (a: number[]) => `'{${a.join(',')}}'`;

const locales = Object.keys(CONTENT_BY_LOCALE) as ContentLocale[];

const out: string[] = [
  '-- Seed species catalogue + Tier-1 content, every registered content locale (T-055, T-160).',
  '-- Generated from the curated Kronoberg set (scripts/gen-species-seed.ts). Idempotent.',
  `-- ${locales.length} locales: ${locales.join(', ')}`,
  'begin;',
];

for (const s of KRONOBERG_SPECIES) {
  out.push(
    `insert into public.species (id, scientific_name, common_name, category, rarity, active_months) values ` +
      `(${q(s.id)}, ${q(s.scientificName)}, ${q(s.commonName)}, ${q(s.category)}, ${q(s.rarity)}, ${arr(s.activeMonths)}) ` +
      `on conflict (id) do update set scientific_name=excluded.scientific_name, common_name=excluded.common_name, ` +
      `category=excluded.category, rarity=excluded.rarity, active_months=excluded.active_months;`,
  );
}

function contentRow(speciesId: string, locale: string, commonName: string | null, c: SpeciesContent): string {
  return (
    `insert into public.species_content (species_id, locale, common_name, fact, when_how, give, protect) values ` +
    `(${q(speciesId)}, ${q(locale)}, ${nq(commonName)}, ${q(c.fact)}, ${q(c.whenAndHow)}, ${q(c.give)}, ${q(c.protect)}) ` +
    `on conflict (species_id, locale) do update set common_name=excluded.common_name, fact=excluded.fact, ` +
    `when_how=excluded.when_how, give=excluded.give, protect=excluded.protect;`
  );
}

for (const locale of locales) {
  const content = CONTENT_BY_LOCALE[locale] ?? {};
  const names = NAMES_BY_LOCALE[locale];
  for (const s of KRONOBERG_SPECIES) {
    const c = content[s.id];
    if (!c) continue;
    // English is the base: its common name lives on the species row, not in a names.*.ts.
    const commonName = names ? (names[s.id] ?? null) : locale === 'en' ? s.commonName : null;
    out.push(contentRow(s.id, locale, commonName, c));
  }
}

out.push('commit;');
console.log(out.join('\n'));
