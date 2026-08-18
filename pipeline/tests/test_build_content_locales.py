"""build_content emits one row per (species, locale) (T-181).

T-179 made facts sourceable per language and T-180 localised the templates; this is the step that
actually uses both. Without it the pipeline still emits English-only rows and the free
immigrant-language roster (T-178) has nothing to load.

No network: the Wikipedia client is faked, which also lets the language plumbing be asserted —
that each locale's fact is fetched from *that* language's edition, not translated from English.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_content import build_localized  # noqa: E402

SPECIES = [
    {"speciesKey": 1, "scientificName": "Pica pica", "months": [4, 5, 6]},
    {"speciesKey": 2, "scientificName": "Nonesuch obscura", "months": []},
]


class FakeWiki:
    """Has an article for Pica pica in en/sv only, and none at all for the second species."""

    def __init__(self):
        self.asked = []

    def fetch_extracts(self, names, lang="en"):
        for name in names:
            self.asked.append((name, lang))
        return {
            n: (f"[{lang}] The magpie is a bird." if n == "Pica pica" and lang in ("en", "sv") else None)
            for n in names
        }


def test_emits_a_row_per_species_per_locale():
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["en", "sv", "so"])
    assert len(rows) == len(SPECIES) * 3


def test_facts_are_fetched_in_one_batch_per_locale_not_one_per_species():
    # T-182: the whole point is ~50x fewer requests; a regression to per-species would still pass
    # every other test here while making a full run take 20 hours.
    wiki = FakeWiki()
    wiki.batches = 0
    inner = wiki.fetch_extracts

    def counted(names, lang="en"):
        wiki.batches += 1
        return inner(names, lang)

    wiki.fetch_extracts = counted
    build_localized(SPECIES, "bird", wiki, ["en", "sv", "so"])
    assert wiki.batches == 3


def test_each_locale_is_fetched_from_its_own_wikipedia():
    wiki = FakeWiki()
    build_localized(SPECIES, "bird", wiki, ["en", "sv", "so"])
    assert ("Pica pica", "sv") in wiki.asked
    assert ("Pica pica", "so") in wiki.asked


def test_a_missing_article_leaves_the_fact_null_rather_than_falling_back():
    # Falling back to English here would put English prose in a Somali card, unlabelled.
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["en", "so"])
    so = next(r for r in rows if r["locale"] == "so" and r["speciesKey"] == 1)
    assert so["fact"] is None
    assert so["factSource"] is None


def test_give_and_protect_are_always_present_even_with_no_fact():
    # Invariant #2: the mission is never gated, including by a language gap.
    wiki = FakeWiki()
    for row in build_localized(SPECIES, "bird", wiki, ["en", "sv", "so", "ar"]):
        assert row["give"].strip()
        assert row["protect"].strip()
        assert row["whenAndHow"].strip()


def test_templates_are_in_the_row_locale_not_english():
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["en", "sv"])
    en = next(r for r in rows if r["locale"] == "en")
    sv = next(r for r in rows if r["locale"] == "sv")
    assert en["give"] != sv["give"]


def test_season_comes_from_the_real_months_in_each_locale():
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["sv"])
    active = next(r for r in rows if r["speciesKey"] == 1)
    assert "från april till juni" in active["whenAndHow"]


def test_a_species_with_no_months_never_claims_a_season():
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["en"])
    quiet = next(r for r in rows if r["speciesKey"] == 2)
    assert "year-round" not in quiet["whenAndHow"]


# T-188: vernacular names reach the card through the content rows, per locale.


def test_common_name_comes_from_the_vernacular_map_for_that_locale():
    wiki = FakeWiki()
    vern = {"1": {"sv": "Skata", "en": "Magpie"}}
    rows = build_localized(SPECIES, "bird", wiki, ["en", "sv"], vern)
    by = {r["locale"]: r for r in rows if r["speciesKey"] == 1}
    assert by["sv"]["commonName"] == "Skata"
    assert by["en"]["commonName"] == "Magpie"


def test_a_locale_with_no_vernacular_name_gets_null_not_the_binomial():
    # The whole point of T-187: a null lets the app render the binomial *as* a binomial.
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["ti"], {"1": {"sv": "Skata"}})
    assert rows[0]["commonName"] is None


def test_no_vernacular_data_at_all_is_not_an_error():
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "bird", wiki, ["sv"])
    assert all(r["commonName"] is None for r in rows)


def test_an_aquatic_species_gets_the_water_habitat_hint():
    # T-191: the otter-in-a-meadow fix, driven by GBIF's realm flags rather than a taxon average.
    wiki = FakeWiki()
    vern = {"1": {"en": "Otter", "_realms": {"freshwater": True, "terrestrial": True}}}
    rows = build_localized(SPECIES, "mammal", wiki, ["en"], vern)
    assert "lakes" in rows[0]["whenAndHow"]


def test_a_terrestrial_species_keeps_the_taxon_hint():
    wiki = FakeWiki()
    vern = {"1": {"en": "Badger", "_realms": {"terrestrial": True}}}
    rows = build_localized(SPECIES, "mammal", wiki, ["en"], vern)
    assert "woodland edges" in rows[0]["whenAndHow"]


def test_a_species_with_no_profile_keeps_the_taxon_hint():
    wiki = FakeWiki()
    rows = build_localized(SPECIES, "mammal", wiki, ["en"], {"1": {"en": "Unknown"}})
    assert "woodland edges" in rows[0]["whenAndHow"]


def test_the_realms_key_is_not_mistaken_for_a_locale_name():
    # "_realms" lives alongside locale keys in the same map; it must never surface as a common name.
    wiki = FakeWiki()
    vern = {"1": {"sv": "Utter", "_realms": {"freshwater": True}}}
    rows = build_localized(SPECIES, "mammal", wiki, ["sv"], vern)
    assert rows[0]["commonName"] == "Utter"
