"""Collapsing an apomictic genus into the card people actually mean (T-163).

GBIF splits *Taraxacum officinale* into hundreds of microspecies — Sweden's data holds **216** of
them carrying 89,286 observations between them. Left alone the app either shows `Taraxacum
piceatum` as a species someone might "spot", or shows a dandelion card with a fraction of the real
presence. Neither is what a person means by *maskros*.

Aggregation is deliberately keyed to a **configured** genus, not applied to every genus with many
members: most genera are genuinely distinct species and collapsing them would be a lie in the other
direction.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.aggregate_genus import aggregate_genus  # noqa: E402


def _r(county, key, name, months, occ):
    return {
        "county": county,
        "countyName": county,
        "speciesKey": key,
        "scientificName": name,
        "activeMonths": months,
        "occurrences": occ,
    }


AGG = {"Taraxacum": "Taraxacum officinale"}


def test_microspecies_collapse_into_the_aggregate():
    records = [
        _r("SWE.9_1", 1, "Taraxacum officinale", [5], 10),
        _r("SWE.9_1", 2, "Taraxacum piceatum", [6], 20),
        _r("SWE.9_1", 3, "Taraxacum alatum", [7], 30),
    ]
    out = aggregate_genus(records, AGG)
    assert len(out) == 1
    assert out[0]["scientificName"] == "Taraxacum officinale"
    assert out[0]["occurrences"] == 60
    assert out[0]["activeMonths"] == [5, 6, 7]


def test_the_aggregate_keeps_the_target_species_key():
    # The key is the app's species id; taking a microspecies' key would rename the card on a re-run.
    out = aggregate_genus(
        [_r("SWE.9_1", 2, "Taraxacum piceatum", [6], 20), _r("SWE.9_1", 1, "Taraxacum officinale", [5], 10)],
        AGG,
    )
    assert out[0]["speciesKey"] == 1


def test_counties_stay_separate():
    out = aggregate_genus(
        [_r("SWE.9_1", 1, "Taraxacum officinale", [5], 10), _r("SWE.1_1", 2, "Taraxacum alatum", [6], 5)],
        AGG,
    )
    assert {r["county"] for r in out} == {"SWE.9_1", "SWE.1_1"}
    assert {r["occurrences"] for r in out} == {10, 5}


def test_other_genera_are_untouched():
    records = [_r("SWE.9_1", 9, "Bellis perennis", [5], 7), _r("SWE.9_1", 1, "Taraxacum officinale", [5], 10)]
    out = aggregate_genus(records, AGG)
    assert any(r["scientificName"] == "Bellis perennis" and r["occurrences"] == 7 for r in out)


def test_a_genus_with_no_target_record_is_left_alone():
    # Without the aggregate's own record there is no key to attach the merge to, and inventing one
    # would produce a species id that does not correspond to anything in GBIF.
    out = aggregate_genus([_r("SWE.9_1", 2, "Taraxacum piceatum", [6], 20)], AGG)
    assert len(out) == 1
    assert out[0]["scientificName"] == "Taraxacum piceatum"


def test_a_genus_name_prefix_does_not_match_a_different_genus():
    # "Taraxacum" must not swallow a hypothetical "Taraxacumoides".
    out = aggregate_genus(
        [_r("SWE.9_1", 1, "Taraxacum officinale", [5], 10), _r("SWE.9_1", 4, "Taraxacumoides falsus", [5], 3)],
        AGG,
    )
    assert {r["scientificName"] for r in out} == {"Taraxacum officinale", "Taraxacumoides falsus"}


def test_no_configured_aggregates_is_a_no_op():
    records = [_r("SWE.9_1", 1, "Taraxacum officinale", [5], 10)]
    assert aggregate_genus(records, {}) == records


def test_output_is_deterministic():
    records = [_r("SWE.2_1", 1, "Taraxacum officinale", [5], 1), _r("SWE.1_1", 1, "Taraxacum officinale", [5], 1)]
    assert [r["county"] for r in aggregate_genus(records, AGG)] == ["SWE.1_1", "SWE.2_1"]
