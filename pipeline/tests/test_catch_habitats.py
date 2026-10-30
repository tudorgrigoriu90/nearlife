"""T-047: which kind of catch spot each species can be met at (land / freshwater / coast)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.db_rows import build_rows  # noqa: E402
from gbif.habitats import catch_habitats  # noqa: E402


def realms(marine=False, freshwater=False, terrestrial=False):
    return {"marine": marine, "freshwater": freshwater, "terrestrial": terrestrial}


def test_realms_map_to_spot_habitats():
    assert catch_habitats("mammal", realms(terrestrial=True)) == ["land"]
    assert catch_habitats("fish", realms(freshwater=True)) == ["freshwater"]
    assert catch_habitats("fish", realms(marine=True, freshwater=True)) == ["freshwater", "coast"]
    # A duck: on the water and on land.
    assert catch_habitats("bird", realms(freshwater=True, terrestrial=True)) == ["land", "freshwater"]


def test_without_realm_data_a_cautious_default_by_group():
    # Never send someone to a picnic table for a pike, and never refuse a bird anywhere.
    assert catch_habitats("fish", None) == ["freshwater", "coast"]
    assert catch_habitats("amphibian", None) == ["land", "freshwater"]
    assert catch_habitats("bird", None) == ["land", "freshwater", "coast"]
    assert catch_habitats("insect", None) == ["land"]
    assert catch_habitats("plant", None) == ["land"]


def test_all_false_realms_count_as_no_data():
    assert catch_habitats("fish", realms()) == ["freshwater", "coast"]


def test_rows_carry_habitats_from_the_vernacular_realms():
    records = [{"speciesKey": 1, "scientificName": "Esox lucius", "county": "SWE.9_1",
                "activeMonths": [5], "occurrences": 3}]
    vernacular = {"1": {"en": "Northern Pike", "_realms": realms(freshwater=True)}}
    species, _ = build_rows([("fish", records)], vernacular)
    assert species[0]["catch_habitats"] == ["freshwater"]
    species, _ = build_rows([("fish", records)], {})
    assert species[0]["catch_habitats"] == ["freshwater", "coast"]


def test_a_run_without_realm_data_never_overwrites_habitats():
    from gbif.supabase_load import species_sql

    assert "catch_habitats = excluded.catch_habitats" in species_sql(have_names=True)
    assert "coalesce(public.species.catch_habitats, excluded.catch_habitats)" in species_sql(have_names=False)
