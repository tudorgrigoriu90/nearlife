"""The content QA sample written after each pipeline run (T-294 · review I-33)."""

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from content_sample import (  # noqa: E402
    COLUMNS,
    SAMPLE_LOCALES,
    SampleRow,
    flags,
    load_claim_phrases,
    summary,
    write_csv,
)

ROOT = Path(__file__).resolve().parents[2]
PHRASES = load_claim_phrases(ROOT / "lib" / "contentHonesty.ts")


def row(**over):
    base = dict(
        species_id="gbif:1",
        scientific_name="Alces alces",
        locale="sv",
        common_name="Älg",
        fact="Älgen är Europas största hjortdjur.",
        fact_source_url="https://sv.wikipedia.org/wiki/%C3%84lg",
        fact_origin="wikipedia",
        when_how="Aktiv i din region hela året.",
        give="Lämna vildvuxna hörn.",
        protect="Kör försiktigt i skymningen.",
        photo_url="https://example/photo.jpg",
    )
    base.update(over)
    return SampleRow(**base)


def test_reads_the_apps_banned_phrases_for_every_locale():
    assert "right now" in PHRASES["en"]
    assert "just nu" in PHRASES["sv"]
    assert "هنا الآن" in PHRASES["ar"]
    source = (ROOT / "lib" / "contentHonesty.ts").read_text(encoding="utf-8")
    block = source[source.index("REALTIME_CLAIM_PHRASES") : source.index("};")]
    assert len(PHRASES) == block.count(": [")


def test_a_clean_row_has_no_flags():
    assert flags(row(), PHRASES) == []


def test_a_real_time_presence_claim_is_flagged():
    assert "honesty: 'just nu'" in flags(row(when_how="Den är här just nu."), PHRASES)


def test_english_text_in_an_arabic_row_is_flagged_as_untranslated():
    r = row(locale="ar", fact="The western barbastelle is a European bat.", common_name="خفاش")
    assert "fact not in the row's script" in flags(r, PHRASES)
    assert flags(row(locale="ar", fact="الخفاش هو حيوان ثديي.", common_name="خفاش"), PHRASES) == []


def test_latin_script_is_expected_in_latin_languages():
    assert flags(row(locale="so", fact="Waa xayawaan.", common_name="Xayawaan"), PHRASES) == []


def test_missing_parts_are_flagged():
    out = flags(row(common_name=None, fact_source_url=None, photo_url=None, give=""), PHRASES)
    assert {"no name", "fact without source", "no photo", "no give text"} <= set(out)


def test_no_fact_is_allowed_but_noted():
    assert flags(row(fact=None, fact_source_url=None, fact_origin=None), PHRASES) == ["no fact"]


def test_the_review_sheet_has_columns_for_the_reviewer(tmp_path):
    out = tmp_path / "sample.csv"
    write_csv([row(), row(locale="en", fact="A moose. Here right now.")], PHRASES, out)
    rows = list(csv.DictReader(out.open(encoding="utf-8")))
    assert list(rows[0]) == COLUMNS
    assert rows[0]["correct"] == "" and rows[0]["reviewer_note"] == ""
    assert "honesty" in rows[1]["auto_flags"]


def test_summary_counts_flagged_rows():
    text = summary([row(), row(common_name=None)], PHRASES)
    assert "2 rows" in text and "1 flagged" in text and "no name: 1" in text


def test_samples_the_main_languages():
    assert SAMPLE_LOCALES[:2] == ["sv", "en"] and len(SAMPLE_LOCALES) == 5


def test_the_sample_query_against_the_schema():
    from pg_harness import URL, connect, fresh

    if not URL:
        import pytest

        pytest.skip("NEARBY_PG_TEST_URL not set (CI sets it)")
    from content_sample import SAMPLE_SQL

    conn = connect()
    fresh(conn, [
        "20260704000001_profiles_and_collection.sql",
        "20260707000001_production_species_tables.sql",
        "20260707000003_regions_and_presence.sql",
        "20261029000002_species_media.sql",
        "20261031000001_species_in_catalogue.sql",
        "20261118000001_fact_sources.sql",
    ])
    for i in range(5):
        conn.execute(
            "insert into public.species (id, scientific_name, common_name, category, rarity, in_catalogue) "
            "values (%s, %s, 'x', 'mammal', 'common', %s)",
            (f"gbif:{i}", f"Genus species{i}", i != 4),
        )
        for loc in ("sv", "en", "de"):
            conn.execute(
                "insert into public.species_content (species_id, locale, fact, when_how, give, protect) "
                "values (%s, %s, 'f', 'w', 'g', 'p')",
                (f"gbif:{i}", loc),
            )
    params = {"seed": "s", "n": 3, "locales": ["sv", "en"]}
    rows = conn.execute(SAMPLE_SQL, params).fetchall()
    conn.close()
    assert len(rows) == 6  # 3 species x the 2 asked languages
    assert {r[0] for r in rows} <= {"gbif:0", "gbif:1", "gbif:2", "gbif:3"}  # catalogue only
    assert [r[2] for r in rows[:2]] == ["sv", "en"]  # languages in the asked order
