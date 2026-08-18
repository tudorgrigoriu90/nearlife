"""Tests for the pure Supabase row-builder (no network / no DB)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.db_rows import (  # noqa: E402
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
