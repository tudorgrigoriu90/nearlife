"""A month is active only when the species is really recorded then (T-268 · review B-04, B-65).

One stray record used to make a month active: the swift, the swallow and the cuckoo were "active
in your region" in January in every county. Now a month counts from a share of the species'
busiest month there and a minimum number of records, the rule the card's county chart uses
(lib/countyStats.ts PRESENT_SHARE).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.aggregate import (  # noqa: E402
    ACTIVE_SHARE,
    MIN_ACTIVE_RECORDS,
    SUMMER_MIGRANTS,
    active_months,
    build_presence,
    migrants_active_in_winter,
    presence_records,
)
from gbif.aggregate_genus import aggregate_genus  # noqa: E402

SWIFT = [2, 1, 0, 3, 900, 3000, 2800, 700, 40, 4, 1, 2]


def test_a_stray_winter_record_is_not_an_active_month():
    # September's 40 records are under 5% of June's 3,000: the tail of the season, not the season.
    assert active_months(SWIFT) == [5, 6, 7, 8]


def test_the_thresholds_are_the_ones_the_card_uses():
    assert ACTIVE_SHARE == 0.05
    assert MIN_ACTIVE_RECORDS == 3


def test_a_month_needs_a_minimum_number_of_records_even_for_a_rare_species():
    assert active_months([0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 0, 0]) == []
    assert active_months([0, 0, 0, 0, 3, 5, 2, 0, 0, 0, 0, 0]) == [5, 6]


def test_a_resident_stays_active_all_year():
    assert active_months([80, 85, 100, 90, 70, 60, 50, 50, 60, 70, 75, 80]) == list(range(1, 13))


def test_records_carry_thresholded_active_months_and_every_recorded_month():
    presence = build_presence([("SWE.9_1", m + 1, 1, c) for m, c in enumerate(SWIFT) if c])
    (record,) = presence_records(presence, {}, {1: "Apus apus"})
    assert record["activeMonths"] == [5, 6, 7, 8]
    assert record["recordedMonths"] == [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12]


def test_merged_genera_sum_their_monthly_counts_before_deciding_active_months():
    base = {"county": "SWE.9_1", "countyName": "K", "occurrences": 0}
    records = [
        {**base, "speciesKey": 1, "scientificName": "Taraxacum officinale",
         "monthCounts": [0, 0, 0, 2, 30, 10, 0, 0, 0, 0, 0, 0], "activeMonths": [5, 6], "recordedMonths": []},
        {**base, "speciesKey": 2, "scientificName": "Taraxacum other",
         "monthCounts": [0, 0, 0, 2, 30, 10, 0, 0, 0, 0, 0, 0], "activeMonths": [5, 6], "recordedMonths": []},
    ]
    (merged,) = aggregate_genus(records, {"Taraxacum": "Taraxacum officinale"})
    # April: 2 records each is under the minimum alone; 4 together is enough.
    assert merged["monthCounts"] == [0, 0, 0, 4, 60, 20, 0, 0, 0, 0, 0, 0]
    assert merged["activeMonths"] == [4, 5, 6]
    assert merged["recordedMonths"] == [4, 5, 6]


def test_the_guard_names_a_summer_migrant_active_in_winter():
    assert {"Apus apus", "Hirundo rustica", "Cuculus canorus", "Delichon urbicum",
            "Pandion haliaetus"} <= set(SUMMER_MIGRANTS)
    ok = {"county": "SWE.9_1", "scientificName": "Apus apus", "activeMonths": [5, 6, 7, 8]}
    bad = {"county": "SWE.12_1", "scientificName": "Hirundo rustica", "activeMonths": [1, 5, 6]}
    other = {"county": "SWE.9_1", "scientificName": "Parus major", "activeMonths": list(range(1, 13))}
    assert migrants_active_in_winter([ok, bad, other]) == ["Hirundo rustica in SWE.12_1: [1]"]
