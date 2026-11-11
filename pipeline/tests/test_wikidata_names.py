"""Species names from Wikidata where GBIF has none (T-258)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_wikidata_names import (  # noqa: E402
    FILL_SQL,
    WIKI_LANG,
    fill_rows,
    merge_into_vernacular,
    names_from_rows,
    query_for,
)


def row(name, kind, lang, value):
    return {
        "name": {"value": name},
        "kind": {"value": kind},
        "lang": {"value": lang},
        "v": {"value": value},
    }


def test_a_stated_common_name_beats_the_wikipedia_title_which_beats_the_label():
    rows = [
        row("Salmo trutta", "label", "ro", "păstrăv comun"),
        row("Salmo trutta", "wiki", "ro", "Păstrăv"),
        row("Parus major", "label", "ro", "Pițigoi mare"),
        row("Parus major", "cn", "ro", "pițigoi mare"),
        row("Alces alces", "label", "ro", "Elan"),
    ]
    assert names_from_rows(rows) == {
        "Salmo trutta": {"ro": "Păstrăv"},
        "Parus major": {"ro": "pițigoi mare"},
        "Alces alces": {"ro": "Elan"},
    }


def test_the_latin_name_and_disambiguated_titles_are_not_names():
    rows = [
        row("Esox lucius", "label", "ro", "Esox lucius"),
        row("Bombus terrestris", "wiki", "de", "Dunkle Erdhummel (Art)"),
        row("Bombus terrestris", "label", "fi", ""),
    ]
    # Wikipedia's "(…)" is stripped as a disambiguator, the binomial is never a name.
    assert names_from_rows(rows) == {"Bombus terrestris": {"de": "Dunkle Erdhummel"}}


def test_wikimedia_language_codes_map_back_to_app_locales():
    assert WIKI_LANG["kmr"] == ["kmr", "ku"]
    rows = [row("Vulpes vulpes", "wiki", "ku", "Rovî"), row("Vulpes vulpes", "label", "sr", "Црвена лисица")]
    assert names_from_rows(rows) == {"Vulpes vulpes": {"kmr": "Rovî", "sr": "Црвена лисица"}}


def test_gbif_names_win_and_wikidata_only_fills_gaps():
    vernacular = {"names": {"1": {"sv": "öring", "en": "Brown Trout", "_realms": {}}, "2": {"_realms": {}}}}
    keys = {"Salmo trutta": 1, "Alces alces": 2}
    wd = {"Salmo trutta": {"ro": "Păstrăv", "sv": "Laxöring"}, "Alces alces": {"ro": "Elan"}}
    merged, added = merge_into_vernacular(vernacular, keys, wd)
    assert merged["names"]["1"] == {"sv": "öring", "en": "Brown Trout", "_realms": {}, "ro": "Păstrăv"}
    assert merged["names"]["2"]["ro"] == "Elan"
    assert added == {"ro": 2}


def test_the_query_asks_every_app_language_once():
    q = query_for(["Salmo trutta", 'Odd "quoted" name'])
    assert '"Salmo trutta"' in q and '\\"quoted\\"' in q
    for code in ("ro", "ku", "kmr", "ckb", "ar", "sv"):
        assert f'"{code}"' in q


def test_loading_fills_only_empty_name_slots():
    assert "c.common_name is null or c.common_name = ''" in FILL_SQL
    assert fill_rows({"Salmo trutta": {"ro": "Păstrăv", "ar": "سلمون مرقط"}}) == [
        {"sci": "Salmo trutta", "locale": "ar", "name": "سلمون مرقط"},
        {"sci": "Salmo trutta", "locale": "ro", "name": "Păstrăv"},
    ]
