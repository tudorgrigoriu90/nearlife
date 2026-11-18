"""Every Wikipedia fact carries its source and whether it was translated (T-276 · review B-59).

Wikipedia text is CC BY-SA 4.0: reuse needs credit (a link to the article), the licence, and a note
when it was changed (a machine translation is a change).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backfill_fact_sources import source_for  # noqa: E402
from media.wikimedia import article_url, map_extract_titles  # noqa: E402


def test_an_article_url_uses_the_edition_and_underscores():
    assert article_url("sv", "Kärrsilja") == "https://sv.wikipedia.org/wiki/K%C3%A4rrsilja"
    assert article_url("en", "Peucedanum palustre") == "https://en.wikipedia.org/wiki/Peucedanum_palustre"
    assert article_url("kmr", "Gur") == "https://ku.wikipedia.org/wiki/Gur"


def test_titles_follow_normalisation_and_redirects():
    payload = {
        "query": {
            "normalized": [{"from": "pica pica", "to": "Pica pica"}],
            "redirects": [{"from": "Pica pica", "to": "Skata"}],
            "pages": {"1": {"title": "Skata", "extract": "Skatan är en fågel."}, "-1": {"title": "Nope", "missing": ""}},
        }
    }
    assert map_extract_titles(payload, ["pica pica", "Nope"]) == {"pica pica": "Skata", "Nope": None}


def test_a_fact_found_in_its_own_edition_is_wikipedia_with_that_article():
    assert source_for("ro", "Pica pica", {"Pica pica": "Coțofană"}, None) == (
        "https://ro.wikipedia.org/wiki/Co%C8%9Bofan%C4%83",
        "wikipedia",
    )


def test_a_fact_with_no_article_in_its_edition_was_translated_from_english():
    en = "https://en.wikipedia.org/wiki/Eurasian_magpie"
    assert source_for("ro", "Pica pica", {"Pica pica": None}, en) == (en, "wikipedia-translated")


def test_an_english_or_swedish_fact_without_an_article_under_its_name_came_through_a_synonym():
    url, origin = source_for("sv", "Thysselinum palustre", {"Thysselinum palustre": None}, None)
    assert origin == "wikipedia"
    assert url == "https://sv.wikipedia.org/w/index.php?search=Thysselinum+palustre&go=Go"


# Every writer records the source with the fact.
def test_the_content_loader_writes_the_source_with_a_fact_and_keeps_it_with_none():
    from gbif.content_rows import build_content_rows
    from gbif.supabase_load_content import CONTENT_SQL

    item = {
        "speciesKey": 1,
        "scientificName": "A b",
        "locale": "sv",
        "fact": "En art.",
        "factUrl": "https://sv.wikipedia.org/wiki/A_b",
        "whenAndHow": "w",
        "give": "g",
        "protect": "p",
    }
    rows, _ = build_content_rows([{"content": [item, {**item, "speciesKey": 2, "fact": None}]}])
    assert rows[0]["fact_source_url"] == "https://sv.wikipedia.org/wiki/A_b"
    assert rows[0]["fact_origin"] == "wikipedia"
    assert rows[1]["fact_source_url"] is None and rows[1]["fact_origin"] is None
    assert "fact_source_url=case when excluded.fact is not null" in CONTENT_SQL


def test_the_backfill_writes_the_article_with_the_fact():
    from backfill_facts import FILL_SQL, fill_rows

    rows = fill_rows("sv", {"Pica pica": "gbif:1"}, {"Pica pica": ("Skata.", "https://sv.wikipedia.org/wiki/Skata")})
    assert rows == [
        {"species_id": "gbif:1", "locale": "sv", "fact": "Skata.", "fact_source_url": "https://sv.wikipedia.org/wiki/Skata"}
    ]
    assert "fact_origin = 'wikipedia'" in FILL_SQL


def test_a_translated_fact_is_marked_and_linked_to_its_source():
    from translate_facts import MISSING_SQL, UPDATE_SQL

    assert "fact_origin = 'wikipedia-translated'" in UPDATE_SQL
    assert "en.fact_source_url" in MISSING_SQL and "sv.fact_source_url" in MISSING_SQL
