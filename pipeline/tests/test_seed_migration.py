"""The species_content seed migration must cover every registered content locale (T-160).

Lives here rather than in the Jest suite because the check reads files off disk and the app's
tsconfig carries no node types; reading TS from Python is already how build_vernacular_names.py
sources the species list, and CI runs this suite alongside `npm run verify`.

These two copies of the same data drifted once already: the generator named en and sv explicitly,
so the 36 locales T-154 added never reached the database. That is invisible on the app's default
hardcoded-repository path and only shows up against Supabase, where `getContentInLocale` has no
English fallback by design — so the dual-language secondary half rendered nothing at all.
"""

import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

REPO = Path(__file__).resolve().parents[2]
MIGRATION = REPO / "supabase/migrations/20260810000001_seed_species_content_all_locales.sql"
LOCALIZED_TS = REPO / "lib/species/localized.ts"
SPECIES_TS = REPO / "lib/species/kronoberg.ts"

_ROW = re.compile(r"insert into public\.species_content \([^)]*\) values \('[^']*', '([a-z-]+)'")
_REGISTRY = re.compile(
    r"export const CONTENT_BY_LOCALE[^{]*\{(.*?)\n\};", re.DOTALL
)
_ENTRY = re.compile(r"^\s{2}([a-z-]+):", re.MULTILINE)


def registered_locales() -> list:
    body = _REGISTRY.search(LOCALIZED_TS.read_text(encoding="utf-8"))
    assert body, "CONTENT_BY_LOCALE not found — has localized.ts changed shape?"
    found = _ENTRY.findall(body.group(1))
    assert found, "no locales parsed from CONTENT_BY_LOCALE"
    return found


def seeded_counts() -> Counter:
    return Counter(_ROW.findall(MIGRATION.read_text(encoding="utf-8")))


def species_count() -> int:
    return len(re.findall(r"\{ id: '[^']+', scientificName:", SPECIES_TS.read_text(encoding="utf-8")))


def test_migration_covers_every_registered_locale():
    assert sorted(seeded_counts()) == sorted(registered_locales())


def test_every_locale_seeds_every_species():
    counts = seeded_counts()
    expected = species_count()
    assert expected > 0
    for locale in registered_locales():
        assert counts[locale] == expected, f"{locale}: {counts[locale]} rows, expected {expected}"


def test_migration_is_idempotent():
    sql = MIGRATION.read_text(encoding="utf-8")
    inserts = len(re.findall(r"insert into public\.species_content", sql))
    upserts = len(re.findall(r"on conflict \(species_id, locale\) do update", sql))
    assert inserts == upserts


def test_apostrophes_are_escaped():
    # Several locales carry ASCII apostrophes (Vanessa dell'ortica, Castor d'Europe). An unescaped
    # one would not raise — it would produce valid SQL that inserts garbage, so count the quotes.
    for line in MIGRATION.read_text(encoding="utf-8").splitlines():
        if line.startswith("insert into public.species_content"):
            assert line.count("'") % 2 == 0, line[:120]


def test_seed_is_one_transaction():
    sql = MIGRATION.read_text(encoding="utf-8").strip()
    assert "begin;" in sql
    assert sql.endswith("commit;")
