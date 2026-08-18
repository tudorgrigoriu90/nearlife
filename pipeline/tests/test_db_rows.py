"""Tests for the pure Supabase row-builder (no network / no DB)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.db_rows import (  # noqa: E402
    adopt_existing_ids,
    build_rows,
    region_rows,
    regions_from_records,
    species_id_for,
    taxon_key_for,
)
from gbif.counties import SWEDISH_COUNTIES  # noqa: E402


def _rec(county, key, name, months, occ):
    return {
        "county": county,
        "countyName": county,
        "speciesKey": key,
        "scientificName": name,
        "activeMonths": months,
        "occurrences": occ,
    }


def test_species_rows_are_deduped_with_unioned_windows_and_summed_occurrences():
    datasets = [
        ("mammals", [
            _rec("SWE.9_1", 100, "Vulpes vulpes", [1, 2, 3], 40),
            _rec("SWE.13_1", 100, "Vulpes vulpes", [3, 4], 60),  # same species, other county
        ]),
        ("reptiles", [
            _rec("SWE.9_1", 200, "Vipera berus", [5, 6], 10),
        ]),
    ]
    species, presence = build_rows(datasets)
    by_id = {s["id"]: s for s in species}

    fox = by_id[species_id_for(100)]
    assert fox["scientific_name"] == "Vulpes vulpes"
    assert fox["taxon_group"] == "mammal" and fox["vertebrate"] is True and fox["category"] == "mammal"
    assert fox["active_months"] == [1, 2, 3, 4]  # union across counties
    assert fox["occurrences"] == 100  # summed

    viper = by_id[species_id_for(200)]
    assert viper["taxon_group"] == "reptile" and viper["vertebrate"] is True
    assert viper["category"] is None  # no minigame category for reptiles


def test_invertebrate_flag_and_presence_rows():
    datasets = [("molluscs", [_rec("SWE.9_1", 300, "Cepaea nemoralis", [6, 7], 12)])]
    species, presence = build_rows(datasets)
    assert species[0]["vertebrate"] is False and species[0]["taxon_group"] == "mollusc"
    assert presence == [
        {"region_id": "SWE.9_1", "species_id": "gbif:300", "active_months": [6, 7], "occurrences": 12}
    ]


def test_region_rows_map_all_counties():
    rows = list(region_rows(SWEDISH_COUNTIES))
    assert len(rows) == 21
    assert {"id": "SWE.9_1", "name": "Kronoberg"} in rows


# T-167: the Nordic ingest writes presence_<taxon>_<ISO3>.json and emits non-Swedish region ids.
# Both broke the loader end-to-end — the taxon lookup KeyError'd on "birds_NOR", and every
# presence row for a Norwegian region violated species_presence.region_id's FK because the only
# regions ever inserted were Sweden's 21 counties. Neither surfaces until a multi-hour ingest has
# already run, so they are pinned here.


def test_taxon_key_strips_the_country_suffix():
    assert taxon_key_for("birds_NOR") == "birds"
    assert taxon_key_for("flora_ISL") == "flora"


def test_taxon_key_leaves_swedens_unsuffixed_names_alone():
    assert taxon_key_for("birds") == "birds"


def test_taxon_key_rejects_an_unknown_suffix_rather_than_guessing():
    # "birds_XXX" is a filename we did not write; mapping it to birds would load a country we
    # never ingested under regions we never inserted.
    try:
        taxon_key_for("birds_XXX")
    except KeyError:
        pass
    else:
        raise AssertionError("expected an unknown country suffix to raise")


def test_regions_come_from_the_data_not_a_hardcoded_country():
    datasets = [
        ("birds", [_rec("SWE.9_1", 1, "Sitta europaea", [5], 10)]),
        ("birds_NOR", [_rec("NOR.1_1", 2, "Pica pica", [5], 10)]),
    ]
    rows = list(regions_from_records(datasets))
    assert {r["id"] for r in rows} == {"SWE.9_1", "NOR.1_1"}


def test_regions_from_records_prefers_the_name_the_ingest_recorded():
    datasets = [("birds_NOR", [
        {
            "county": "NOR.1_1",
            "countyName": "Agder",
            "speciesKey": 1,
            "scientificName": "Pica pica",
            "activeMonths": [5],
            "occurrences": 9,
        }
    ])]
    assert list(regions_from_records(datasets)) == [{"id": "NOR.1_1", "name": "Agder"}]


def test_regions_from_records_dedupes_and_is_deterministic():
    datasets = [
        ("birds_DNK", [_rec("DNK.2_1", 1, "A", [5], 3), _rec("DNK.1_1", 2, "B", [5], 3)]),
        ("flora_DNK", [_rec("DNK.1_1", 3, "C", [5], 3)]),
    ]
    assert [r["id"] for r in regions_from_records(datasets)] == ["DNK.1_1", "DNK.2_1"]


# T-184: the curated 54 and the GBIF catalogue are the same species. `great-tit` already holds
# gbif_key 9705453, so minting `gbif:9705453` for Parus major violates species_gbif_key_idx and
# rolls back the entire load — which is exactly what happened after a 1h48m ingest.
#
# The curated id is the one to keep: 38 locales of hand-written content and the Storage photos are
# keyed to it. The GBIF row is the same animal arriving by a different route.


def test_a_gbif_species_adopts_the_curated_id_that_already_owns_its_key():
    species = [{"id": "gbif:9705453", "gbif_key": 9705453, "scientific_name": "Parus major"}]
    presence = [{"region_id": "SWE.9_1", "species_id": "gbif:9705453", "occurrences": 10}]
    sp, pr = adopt_existing_ids(species, presence, {9705453: "great-tit"})
    assert sp[0]["id"] == "great-tit"
    assert pr[0]["species_id"] == "great-tit"


def test_species_with_no_curated_counterpart_are_untouched():
    species = [{"id": "gbif:111", "gbif_key": 111, "scientific_name": "Pica pica"}]
    presence = [{"region_id": "SWE.9_1", "species_id": "gbif:111", "occurrences": 3}]
    sp, pr = adopt_existing_ids(species, presence, {9705453: "great-tit"})
    assert sp[0]["id"] == "gbif:111"
    assert pr[0]["species_id"] == "gbif:111"


def test_the_gbif_key_is_preserved_when_adopting():
    # The key is what proves the two rows are one species; losing it would let them split again.
    species = [{"id": "gbif:9705453", "gbif_key": 9705453, "scientific_name": "Parus major"}]
    sp, _ = adopt_existing_ids(species, [], {9705453: "great-tit"})
    assert sp[0]["gbif_key"] == 9705453


def test_every_presence_row_follows_its_species():
    species = [{"id": "gbif:9705453", "gbif_key": 9705453, "scientific_name": "Parus major"}]
    presence = [
        {"region_id": r, "species_id": "gbif:9705453", "occurrences": 1}
        for r in ("SWE.1_1", "SWE.9_1", "SWE.21_1")
    ]
    _, pr = adopt_existing_ids(species, presence, {9705453: "great-tit"})
    assert {p["species_id"] for p in pr} == {"great-tit"}


def test_an_empty_existing_map_is_a_no_op():
    species = [{"id": "gbif:1", "gbif_key": 1, "scientific_name": "A"}]
    sp, _ = adopt_existing_ids(species, [], {})
    assert sp[0]["id"] == "gbif:1"


# T-187: `common_name` was set to the scientific name, so the app rendered "Lutra lutra" as if it
# were what people call the animal. A null is honest and lets the UI style the binomial as a
# binomial; a copy is a quiet lie in the single most visible string on the card.


def test_common_name_is_null_when_unknown_rather_than_the_binomial():
    rows, _ = build_rows([("birds", [_rec("SWE.9_1", 1, "Pica pica", [5], 10)])])
    assert rows[0]["common_name"] is None
    assert rows[0]["scientific_name"] == "Pica pica"
