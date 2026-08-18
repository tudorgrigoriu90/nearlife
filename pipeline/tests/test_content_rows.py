"""Tests for the pure species_content row-builder (no network / no DB) — T-145.

Mirrors test_db_rows.py: exercises the pure mapping from generated content JSON
(build_content.py output) to the `public.species_content` rows the loader upserts.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.content_rows import build_content_rows  # noqa: E402
from gbif.db_rows import species_id_for  # noqa: E402


def _item(key, name, fact, taxon="mammal"):
    """A build_content.py content item (matches data/content_mammal.json shape)."""
    return {
        "speciesKey": key,
        "scientificName": name,
        "taxonGroup": taxon,
        "fact": fact,  # None when Wikipedia has no article — never fabricated
        "factSource": "Wikipedia" if fact else None,
        "factLicense": "CC BY-SA" if fact else None,
        "whenAndHow": f"Active in your region year-round. Look for it in {taxon} cover.",
        "give": "give-template",
        "protect": "protect-template",
        "status": "machine",
        "needsReview": True,
        "curationStatus": "uncurated",
    }


def test_maps_content_item_to_species_content_row():
    payload = {"meta": {}, "content": [_item(100, "Vulpes vulpes", "The red fox is a mammal.")]}
    rows, summary = build_content_rows([payload])

    assert len(rows) == 1
    row = rows[0]
    assert row["species_id"] == species_id_for(100)  # gbif:100 — matches the species loader
    assert row["locale"] == "en"
    assert row["common_name"] is None  # localized names arrive via names.sv / review, not here
    assert row["fact"] == "The red fox is a mammal."
    assert row["when_how"] == "Active in your region year-round. Look for it in mammal cover."
    assert row["give"] == "give-template" and row["protect"] == "protect-template"
    assert row["always_free"] is True  # invariant #2 — Tier-1 + give/protect always free
    assert summary == {"total": 1, "with_fact": 1, "without_fact": 0, "skipped_dup": 0}


def test_loads_fact_less_species_with_null_fact_for_the_mission_content():
    # T-146: a species with no article still gets a row (fact=None) so its give/protect are free
    # for every species (invariant #2). A blank/whitespace fact is normalized to None — never
    # fabricated (invariant #1).
    payload = {"content": [_item(1, "A b", None), _item(2, "C d", "   "), _item(3, "E f", "a real fact")]}
    rows, summary = build_content_rows([payload])

    by_id = {r["species_id"]: r for r in rows}
    assert len(rows) == 3  # every species loaded
    assert by_id[species_id_for(1)]["fact"] is None
    assert by_id[species_id_for(2)]["fact"] is None  # whitespace-only → None
    assert by_id[species_id_for(3)]["fact"] == "a real fact"
    # mission content is present regardless of whether a fact exists
    assert by_id[species_id_for(1)]["give"] == "give-template"
    assert summary == {"total": 3, "with_fact": 1, "without_fact": 2, "skipped_dup": 0}


def test_dedupes_by_species_and_locale_keeping_first():
    payload = {"content": [_item(7, "Dup sp", "fact one"), _item(7, "Dup sp", "fact two")]}
    rows, summary = build_content_rows([payload])

    assert len(rows) == 1 and rows[0]["fact"] == "fact one"
    assert summary["skipped_dup"] == 1


def test_locale_override_tags_rows():
    payload = {"content": [_item(9, "Sv sp", "svensk fakta")]}
    rows, _ = build_content_rows([payload], locale="sv")
    assert rows[0]["locale"] == "sv"


def test_accepts_a_bare_content_list():
    rows, summary = build_content_rows([[_item(5, "Bare", "fact")]])
    assert len(rows) == 1 and summary["total"] == 1


# T-183: content items now carry their own `locale` (T-181). The loader previously stamped every
# row with a single caller-supplied locale, which would have collapsed all 18 languages onto
# ('species', 'en') — the dedupe key — and silently kept whichever arrived first. Eighteen
# languages of work, seventeen of them discarded, with a successful-looking load.


def _loc_item(locale, name="Pica pica", fact="A magpie."):
    return {
        "speciesKey": 1,
        "scientificName": name,
        "locale": locale,
        "fact": fact,
        "whenAndHow": f"[{locale}] when",
        "give": f"[{locale}] give",
        "protect": f"[{locale}] protect",
    }


def test_each_item_keeps_its_own_locale():
    rows, _ = build_content_rows([[_loc_item("en"), _loc_item("sv"), _loc_item("ar")]])
    assert {r["locale"] for r in rows} == {"en", "sv", "ar"}


def test_the_same_species_in_three_languages_is_three_rows_not_one():
    rows, summary = build_content_rows([[_loc_item("en"), _loc_item("sv"), _loc_item("ar")]])
    assert len(rows) == 3
    assert summary["skipped_dup"] == 0


def test_a_genuine_duplicate_within_one_locale_is_still_skipped():
    rows, summary = build_content_rows([[_loc_item("sv"), _loc_item("sv")]])
    assert len(rows) == 1
    assert summary["skipped_dup"] == 1


def test_items_without_a_locale_fall_back_to_the_argument():
    # Older content_*.json payloads predate the locale field; they must still load as English.
    legacy = {k: v for k, v in _loc_item("en").items() if k != "locale"}
    rows, _ = build_content_rows([[legacy]], locale="en")
    assert rows[0]["locale"] == "en"


# T-188: the loader must carry the sourced common name through to species_content, per locale.


def test_common_name_reaches_the_row():
    item = _loc_item("sv")
    item["commonName"] = "Skata"
    rows, _ = build_content_rows([[item]])
    assert rows[0]["common_name"] == "Skata"


def test_a_missing_common_name_stays_null():
    rows, _ = build_content_rows([[_loc_item("ti")]])
    assert rows[0]["common_name"] is None


def test_a_blank_common_name_is_normalised_to_null():
    # An empty string would render as a blank card title — worse than falling back to the binomial.
    item = _loc_item("sv")
    item["commonName"] = "   "
    rows, _ = build_content_rows([[item]])
    assert rows[0]["common_name"] is None


# T-193: the content loader is about to run in CI unattended, so "nothing to load" has to be
# distinguishable from "loaded nothing". An empty content set means build_content did not run —
# a no-op, not a reason to fail a pipeline whose other steps succeeded.


def test_no_content_files_yields_no_rows_and_says_so():
    rows, summary = build_content_rows([])
    assert rows == []
    assert summary["total"] == 0
