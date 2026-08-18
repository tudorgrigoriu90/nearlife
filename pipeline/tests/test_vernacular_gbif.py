"""Vernacular names from GBIF, per locale (T-187).

Every one of the 6,824 shipped species currently carries its Latin binomial in `common_name`
(`db_rows.py` set `common_name = scientific_name`), so a card title reads "Lutra lutra" as though
that were the common name. It is the most visible gap left in v1.

GBIF's /species/{key}/vernacularNames returns every language it holds in one call, which is 6,824
calls for all 18 locales rather than 18 passes. Its language codes are ISO 639-3 ("swe", "eng"),
so they have to be mapped onto the app's locales — and anything unmapped must be dropped rather
than guessed at.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.vernacular import parse_vernacular_names  # noqa: E402


def _payload(*entries):
    return {"results": [dict(e) for e in entries]}


def test_maps_iso_639_3_onto_app_locales():
    got = parse_vernacular_names(
        _payload(
            {"vernacularName": "Great Tit", "language": "eng"},
            {"vernacularName": "Talgoxe", "language": "swe"},
        )
    )
    assert got == {"en": "Great Tit", "sv": "Talgoxe"}


def test_accepts_two_letter_codes_too():
    # GBIF is not consistent about which code set a dataset uses.
    assert parse_vernacular_names(_payload({"vernacularName": "Talgoxe", "language": "sv"})) == {
        "sv": "Talgoxe"
    }


def test_a_preferred_name_wins_over_an_earlier_one():
    got = parse_vernacular_names(
        _payload(
            {"vernacularName": "Tit", "language": "eng"},
            {"vernacularName": "Great Tit", "language": "eng", "preferred": True},
        )
    )
    assert got == {"en": "Great Tit"}


def test_first_name_wins_when_none_is_preferred():
    got = parse_vernacular_names(
        _payload(
            {"vernacularName": "Talgoxe", "language": "swe"},
            {"vernacularName": "Talgmes", "language": "swe"},
        )
    )
    assert got == {"sv": "Talgoxe"}


def test_languages_we_do_not_ship_are_dropped():
    got = parse_vernacular_names(_payload({"vernacularName": "Kohlmeise", "language": "deu"}))
    assert "de" not in got


def test_an_unknown_language_code_is_dropped_not_guessed():
    # Mapping "xyz" onto some locale by shape would put a name in front of the wrong reader.
    assert parse_vernacular_names(_payload({"vernacularName": "???", "language": "xyz"})) == {}


def test_entries_with_no_language_are_dropped():
    assert parse_vernacular_names(_payload({"vernacularName": "Nameless"})) == {}


def test_blank_names_are_dropped_rather_than_stored_as_empty():
    assert parse_vernacular_names(_payload({"vernacularName": "   ", "language": "swe"})) == {}


def test_names_are_trimmed():
    assert parse_vernacular_names(_payload({"vernacularName": "  Talgoxe  ", "language": "swe"})) == {
        "sv": "Talgoxe"
    }


def test_an_empty_payload_is_an_empty_map_not_an_error():
    assert parse_vernacular_names({}) == {}
    assert parse_vernacular_names({"results": []}) == {}
