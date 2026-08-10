"""Tests for vernacular-name sourcing (T-159).

All offline: the network layer is a thin client (vernacular/client.py), everything that decides
what counts as a real name lives in vernacular/sources.py and is exercised here against fixtures.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vernacular.sources import (  # noqa: E402
    emit_names_module,
    merge_sources,
    names_from_sitelinks,
    names_from_sparql,
    unsourced,
)

SPECIES = [
    ("common-blackbird", "Turdus merula"),
    ("roe-deer", "Capreolus capreolus"),
    ("scots-pine", "Pinus sylvestris"),
]


def _sparql(rows):
    return {"results": {"bindings": [
        {"sci": {"value": s}, "name": {"value": n}} for s, n in rows
    ]}}


def test_sparql_rows_key_by_scientific_name():
    got = names_from_sparql(_sparql([("Turdus merula", "Lon dubh")]))
    assert got == {"Turdus merula": "Lon dubh"}


def test_sparql_ignores_a_name_equal_to_the_scientific_name():
    # Wikidata sometimes carries the binomial as a "common name"; that is not a vernacular name,
    # and shipping it would tell the reader their language has a word for this when it does not.
    got = names_from_sparql(_sparql([("Pinus sylvestris", "Pinus sylvestris")]))
    assert got == {}


def test_sparql_keeps_the_first_of_several_candidates():
    # Deterministic output matters: the emitted file is committed, so a rerun must not churn.
    got = names_from_sparql(_sparql([
        ("Turdus merula", "Lon dubh"),
        ("Turdus merula", "Céirseach"),
    ]))
    assert got == {"Turdus merula": "Lon dubh"}


def test_sitelink_titles_drop_disambiguators_and_scientific_titles():
    pages = {
        "Turdus merula": "Lon dubh (éan)",
        "Pinus sylvestris": "Pinus sylvestris",
    }
    got = names_from_sitelinks(pages)
    assert got == {"Turdus merula": "Lon dubh"}


def test_merge_prefers_an_explicit_common_name_over_an_article_title():
    # P1843 is an assertion that this IS the vernacular name. An article title is only a title —
    # a wiki may file a species under any heading, including a translated English phrase.
    merged = merge_sources(
        {"Turdus merula": "Lon dubh"},
        {"Turdus merula": "Céirseach"},
    )
    assert merged["Turdus merula"] == "Lon dubh"


def test_merge_falls_back_to_the_article_title_when_no_common_name_exists():
    merged = merge_sources({}, {"Turdus merula": "Lon dubh"})
    assert merged["Turdus merula"] == "Lon dubh"


def test_unsourced_lists_every_species_with_no_name():
    gaps = unsourced(SPECIES, {"Turdus merula": "Lon dubh"})
    assert gaps == [
        ("roe-deer", "Capreolus capreolus"),
        ("scots-pine", "Pinus sylvestris"),
    ]


def test_unsourced_is_empty_when_every_species_resolved():
    full = {sci: "x" for _, sci in SPECIES}
    assert unsourced(SPECIES, full) == []


def test_emit_refuses_to_write_a_partial_module():
    # A missing name renders a blank half: `contentInLocale` deliberately has no English fallback
    # (T-154), so a partial locale is worse than an absent one. Fail loudly instead.
    try:
        emit_names_module("ga", "GA", SPECIES, {"Turdus merula": "Lon dubh"})
    except ValueError as err:
        assert "roe-deer" in str(err) and "scots-pine" in str(err)
    else:
        raise AssertionError("expected a partial emit to raise")


def test_emit_produces_a_module_matching_the_hand_written_locales():
    names = {sci: f"N-{sci}" for _, sci in SPECIES}
    out = emit_names_module("ga", "GA", SPECIES, names)
    assert "export const GA_NAMES: Record<string, string> = {" in out
    assert "'common-blackbird': 'N-Turdus merula'," in out
    assert out.rstrip().endswith("};")
    # Sourced, not authored — the header has to say so, since every other names.*.ts claims to be
    # a Claude translation and a reader diffing them would otherwise assume the same provenance.
    assert "T-159" in out and "Wikidata" in out


def test_emit_escapes_an_apostrophe_in_a_name():
    # Irish and Maltese both use apostrophes (d', l-, Ta') inside ordinary words.
    out = emit_names_module("mt", "MT", [("osprey", "Pandion haliaetus")], {"Pandion haliaetus": "Ta' l-ilma"})
    assert "osprey: 'Ta\\' l-ilma'," in out


def test_emit_quotes_a_key_that_is_not_a_valid_identifier():
    # Matches the hand-written locales, which write `osprey:` bare but `'red-fox':` quoted.
    out = emit_names_module("ga", "GA", [("red-fox", "Vulpes vulpes")], {"Vulpes vulpes": "Sionnach"})
    assert "'red-fox': 'Sionnach'," in out
