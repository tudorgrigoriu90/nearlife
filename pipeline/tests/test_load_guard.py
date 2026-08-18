"""Refusing an implausible load (T-192).

The Director's decision (T-172) is that the annual refresh runs unattended — they may not be
available in February, and a pipeline that needs someone present is a pipeline that silently stops.

That removes the person who would have noticed a bad ingest before it overwrote good data. It does
not remove the *need* to notice. So the check becomes automatic: a refresh that arrives with far
less data than the database already holds is refused rather than committed, because the likeliest
explanations — a half-finished ingest, a GBIF outage, a taxon that failed — all look identical to
"Sweden lost 60% of its species this year".

Growth is never suspicious; that is what a refresh is for.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.load_guard import LoadPolicy, check_load_sanity  # noqa: E402


def test_a_normal_refresh_passes():
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 12100, "presence": 79800})
    assert v.ok


def test_modest_shrinkage_passes_because_taxonomy_lumps_species():
    # GBIF merges species every year; a few percent down is ordinary, not a failure.
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 11600, "presence": 77000})
    assert v.ok


def test_a_collapse_is_refused():
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 4000, "presence": 30000})
    assert not v.ok
    assert "species" in v.reason


def test_an_empty_incoming_dataset_is_refused():
    # The single most dangerous case: an ingest that produced nothing would otherwise delete nothing
    # but record success, and the next run would compare against a hollow baseline.
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 0, "presence": 0})
    assert not v.ok


def test_the_first_ever_load_is_allowed():
    # An empty database is not evidence of a bad ingest; it is a new project.
    v = check_load_sanity(existing={"species": 0, "presence": 0},
                          incoming={"species": 11936, "presence": 78530})
    assert v.ok


def test_presence_collapse_is_caught_even_when_species_look_fine():
    # A taxon failing mid-ingest can keep the species list broadly intact while gutting presence.
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 11900, "presence": 20000})
    assert not v.ok
    assert "presence" in v.reason


def test_the_threshold_is_configurable_rather_than_hardcoded():
    lenient = LoadPolicy(min_ratio=0.3)
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 4000, "presence": 30000}, policy=lenient)
    assert v.ok


def test_the_reason_names_the_numbers_so_a_log_is_actionable():
    v = check_load_sanity(existing={"species": 11936, "presence": 78530},
                          incoming={"species": 4000, "presence": 30000})
    assert "11936" in v.reason and "4000" in v.reason
