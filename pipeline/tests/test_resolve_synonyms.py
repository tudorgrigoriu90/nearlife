"""Species Wikipedia files under another name (T-260)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.supabase_load_content import CONTENT_SQL  # noqa: E402
from resolve_synonyms import gbif_synonyms, orphans, photo_row, pick_alias  # noqa: E402


def test_a_species_is_an_orphan_when_no_wikipedia_has_an_article_under_its_name():
    links = {"Pica pica": 120, "Thysselinum palustre": 0}
    assert orphans(["Pica pica", "Thysselinum palustre", "Accipiter gentilis"], links) == [
        "Thysselinum palustre",
        "Accipiter gentilis",
    ]


def test_gbif_synonyms_are_species_names_other_than_the_accepted_one():
    results = [
        {"canonicalName": "Peucedanum palustre", "rank": "SPECIES"},
        {"canonicalName": "Peucedanum palustre", "rank": "SPECIES"},
        {"canonicalName": "Peucedanum palustre simplex", "rank": "FORM"},
        {"canonicalName": "Thysselinum palustre", "rank": "SPECIES"},
        {"rank": "SPECIES"},
    ]
    assert gbif_synonyms(results, "Thysselinum palustre") == ["Peucedanum palustre"]


def test_wikidata_s_own_synonym_link_wins_then_the_best_known_gbif_synonym():
    # The goshawk: Wikidata says Astur gentilis has Accipiter gentilis as a synonym.
    assert pick_alias([(104, "Astur gentilis")], [(3, "Astur palumbarius")]) == "Astur gentilis"
    # The milk-parsley: only GBIF knows Peucedanum palustre; the most-linked synonym is chosen.
    assert pick_alias([], [(2, "Peucedanum sylvestre"), (22, "Peucedanum palustre")]) == "Peucedanum palustre"
    assert pick_alias([], [(0, "Nobody knows")]) is None
    assert pick_alias([], []) is None


def test_a_content_rebuild_never_erases_a_filled_name_or_fact():
    assert "common_name=coalesce(excluded.common_name, public.species_content.common_name)" in CONTENT_SQL
    assert "fact=coalesce(excluded.fact, public.species_content.fact)" in CONTENT_SQL


def test_a_photo_row_keeps_its_licence_and_credit():
    found = {"sourceUrl": "https://www.inaturalist.org/photos/1", "author": ""}
    assert photo_row("gbif:1", found, "CC-BY", "https://x/gbif-1.jpg") == {
        "species_id": "gbif:1",
        "url": "https://x/gbif-1.jpg",
        "source_url": "https://www.inaturalist.org/photos/1",
        "author": "Unknown",
        "license": "CC-BY",
    }
