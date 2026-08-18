"""Persisting the shipping catalogue (T-136).

The noise filter has been run ad hoc to answer questions — "how many species ship?" — but its
verdict has never been written down. That makes the v1 catalogue an opinion recomputed on demand
rather than an artefact: nothing downstream can read it, nobody can diff it between runs, and a
species that quietly stops qualifying leaves no trace.

Every verdict is recorded, including the exclusions and their reasons. A species dropped silently
cannot be argued with later, and "why isn't the mourning dove in the app?" deserves an answer that
is not "re-run the filter and see".
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.catalogue import build_catalogue, catalogue_summary  # noqa: E402


def _rec(county, key, name, months, occ):
    return {
        "county": county,
        "countyName": county,
        "speciesKey": key,
        "scientificName": name,
        "activeMonths": months,
        "occurrences": occ,
    }


def _common(name, key):
    # Well over every threshold: many counties, many months, plenty of records.
    return [_rec(f"SWE.{i}_1", key, name, [1, 2, 3], 500) for i in range(1, 6)]


def test_a_common_species_is_included_with_its_totals():
    entry = build_catalogue([("birds", _common("Parus major", 1))])["included"][0]
    assert entry["scientificName"] == "Parus major"
    assert entry["occurrences"] == 2500
    assert entry["counties"] == 5
    assert entry["taxon"] == "birds"


def test_a_single_record_vagrant_is_excluded_with_a_reason():
    cat = build_catalogue([("birds", [_rec("SWE.9_1", 2, "Zenaida macroura", [5], 1)])])
    assert cat["included"] == []
    dropped = cat["excluded"][0]
    assert dropped["scientificName"] == "Zenaida macroura"
    assert dropped["reason"], "an exclusion without a reason cannot be argued with"


def test_both_lists_are_written_not_just_the_survivors():
    cat = build_catalogue(
        [("birds", _common("Parus major", 1) + [_rec("SWE.9_1", 2, "Zenaida macroura", [5], 1)])]
    )
    assert len(cat["included"]) == 1
    assert len(cat["excluded"]) == 1


def test_a_species_recorded_in_several_taxa_files_is_counted_once():
    cat = build_catalogue([("birds", _common("Parus major", 1)), ("birds", _common("Parus major", 1))])
    assert len(cat["included"]) == 1
    assert cat["included"][0]["occurrences"] == 5000


def test_the_catalogue_is_ordered_by_prevalence():
    records = _common("Parus major", 1) + [_rec(f"SWE.{i}_1", 2, "Pica pica", [1], 100) for i in range(1, 6)]
    names = [e["scientificName"] for e in build_catalogue([("birds", records)])["included"]]
    assert names == ["Parus major", "Pica pica"]


def test_summary_reports_both_species_and_observation_share():
    # Species share alone understates the filter badly: it drops ~43% of species carrying 0.37% of
    # observations, and only the second number shows that almost nothing encounterable is lost.
    cat = build_catalogue(
        [("birds", _common("Parus major", 1) + [_rec("SWE.9_1", 2, "Zenaida macroura", [5], 1)])]
    )
    summary = catalogue_summary(cat)
    assert summary["includedSpecies"] == 1
    assert summary["excludedSpecies"] == 1
    assert summary["includedObservationPct"] > 99.0


def test_an_empty_dataset_summarises_without_dividing_by_zero():
    assert catalogue_summary(build_catalogue([]))["includedObservationPct"] == 0.0
