"""Tests for the pure GBIF presence aggregation (no network)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.aggregate import build_presence, presence_records  # noqa: E402


def test_build_presence_merges_months_and_counts():
    rows = [
        ("SWE.9_1", 5, 100, 10),
        ("SWE.9_1", 6, 100, 5),  # same county+species, another month
        ("SWE.9_1", 5, 200, 3),  # different species
        ("SWE.13_1", 5, 100, 7),  # same species, different county
    ]
    presence = build_presence(rows)
    assert presence[("SWE.9_1", 100)] == {"months": {5, 6}, "occurrences": 15, "monthCounts": [0, 0, 0, 0, 10, 5, 0, 0, 0, 0, 0, 0]}
    assert presence[("SWE.9_1", 200)] == {"months": {5}, "occurrences": 3, "monthCounts": [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0]}
    assert presence[("SWE.13_1", 100)] == {"months": {5}, "occurrences": 7, "monthCounts": [0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0]}


def test_presence_records_flattens_sorts_and_names():
    presence = {
        ("SWE.9_1", 100): {"months": {6, 5}, "occurrences": 15},
        ("SWE.9_1", 200): {"months": {5}, "occurrences": 40},
    }
    county_names = {"SWE.9_1": "Kronoberg"}
    names = {100: "Apus apus", 200: "Vulpes vulpes"}
    records = list(presence_records(presence, county_names, names))

    # sorted by county then descending occurrences → the fox (40) before the swift (15)
    assert [r["speciesKey"] for r in records] == [200, 100]
    swift = next(r for r in records if r["speciesKey"] == 100)
    assert swift["countyName"] == "Kronoberg"
    assert swift["scientificName"] == "Apus apus"
    assert swift["activeMonths"] == [5, 6]  # sorted


def test_presence_records_falls_back_when_name_missing():
    presence = {("SWE.1_1", 999): {"months": {1}, "occurrences": 1}}
    records = list(presence_records(presence, {}, {}))
    assert records[0]["countyName"] == "SWE.1_1"  # gid fallback
    assert records[0]["scientificName"] == "999"  # key fallback


def test_monthly_counts_are_kept_for_the_county_card():
    # T-261: the card shows when a species is seen in the county, month by month.
    presence = build_presence([("SWE.9_1", 4, 100, 2), ("SWE.9_1", 5, 100, 30), ("SWE.9_1", 5, 100, 8)])
    records = list(presence_records(presence, {}, {}))
    assert records[0]["monthCounts"] == [0, 0, 0, 2, 38, 0, 0, 0, 0, 0, 0, 0]
    assert records[0]["occurrences"] == 40


def test_records_from_before_monthly_counts_still_flatten():
    records = list(presence_records({("SWE.9_1", 1): {"months": {5}, "occurrences": 3}}, {}, {}))
    assert records[0]["monthCounts"] is None
