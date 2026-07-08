"""Tests for the pure Supabase row-builder (no network / no DB)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.db_rows import build_rows, region_rows, species_id_for  # noqa: E402
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
