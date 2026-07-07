// One-off generator: emits idempotent seed SQL for public.species + public.species_content from
// the curated Kronoberg data (the same data the app ships). Run: `npx tsx scripts/gen-species-seed.ts`.
// Output is applied to the DB via the Supabase connector and saved as a seed migration (T-055 seed).
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { KRONOBERG_CONTENT, type SpeciesContent } from '../lib/species/content';
import { SV_CONTENT } from '../lib/species/content.sv';
import { SV_NAMES } from '../lib/species/names.sv';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const nq = (s: string | null | undefined) => (s == null ? 'null' : q(s));
const arr = (a: number[]) => `'{${a.join(',')}}'`;

const out: string[] = [
  '-- 0005 — seed species catalogue + Tier-1 content (T-055 seed).',
  '-- Generated from the curated Kronoberg set (scripts/gen-species-seed.ts). Idempotent.',
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

for (const s of KRONOBERG_SPECIES) {
  const en = KRONOBERG_CONTENT[s.id];
  if (en) out.push(contentRow(s.id, 'en', s.commonName, en));
  const sv = SV_CONTENT[s.id];
  if (sv) out.push(contentRow(s.id, 'sv', SV_NAMES[s.id] ?? null, sv));
}

out.push('commit;');
console.log(out.join('\n'));
