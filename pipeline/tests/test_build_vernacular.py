"""The vernacular-name ingest (T-188) — pure parts only, no network.

6,824 species is ~40 minutes of polite GBIF calls, so the job has to be resumable: a failure at
species 6,000 must not throw away the first 5,999. And because coverage is expected to be very
uneven across the 18 locales, the run has to *report* what it got rather than let anyone assume.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_vernacular import coverage_report, merge_existing, pending_keys  # noqa: E402


def test_pending_skips_species_already_fetched():
    # Resumability: a re-run must pick up where the last one stopped.
    assert pending_keys([1, 2, 3], {"2": {"sv": "Talgoxe"}}) == [1, 3]


def test_pending_treats_a_recorded_empty_result_as_done():
    # "GBIF has no vernacular name for this species" is an answer, not a gap to retry forever.
    assert pending_keys([1, 2], {"1": {}}) == [2]


def test_pending_is_everything_on_a_first_run():
    assert pending_keys([1, 2, 3], {}) == [1, 2, 3]


def test_merge_keeps_earlier_results_and_adds_new_ones():
    merged = merge_existing({"1": {"sv": "Talgoxe"}}, {2: {"sv": "Rödhake"}})
    assert merged == {"1": {"sv": "Talgoxe"}, "2": {"sv": "Rödhake"}}


def test_merge_lets_a_fresh_fetch_replace_a_stale_one():
    merged = merge_existing({"1": {"sv": "Gammal"}}, {1: {"sv": "Ny"}})
    assert merged == {"1": {"sv": "Ny"}}


def test_coverage_counts_names_per_locale():
    names = {"1": {"sv": "Talgoxe", "en": "Great Tit"}, "2": {"sv": "Rödhake"}, "3": {}}
    report = coverage_report(names, ["sv", "en", "ti"])
    assert report["sv"] == {"named": 2, "total": 3, "pct": 66.7}
    assert report["en"] == {"named": 1, "total": 3, "pct": 33.3}


def test_coverage_reports_zero_rather_than_omitting_an_empty_locale():
    # An absent line reads as "not checked"; an explicit 0.0% reads as "checked, GBIF has nothing".
    report = coverage_report({"1": {"sv": "Talgoxe"}}, ["sv", "ti"])
    assert report["ti"] == {"named": 0, "total": 1, "pct": 0.0}


def test_coverage_of_nothing_does_not_divide_by_zero():
    assert coverage_report({}, ["sv"]) == {"sv": {"named": 0, "total": 0, "pct": 0.0}}
