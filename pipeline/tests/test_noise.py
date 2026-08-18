"""Encounterability filter (T-136 / T-167).

GBIF records what was *recorded*, not what a person can reasonably meet: zoo animals, garden
escapees, one-off vagrants and misidentifications all appear. Presenting those as "active in your
region this season" breaks invariant #1 exactly as an invented fact would.

The bar this module has to clear, and the reason it is not a plain threshold: **rarity is not
noise**. The osprey carries 372,495 records across all 21 Swedish counties while the app tags it
`rare` — that tag is an encounter-frequency flavour, not scarcity. A naive "drop the uncommon"
rule would throw away real species and keep well-recorded escapees.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.noise import (  # noqa: E402
    DEFAULT_POLICY,
    SpeciesSignals,
    classify,
    filter_species,
)


def sig(occ=1000, counties=10, months=6, **kw):
    return SpeciesSignals(scientific_name=kw.get("name", "Testus testus"),
                          occurrences=occ, counties=counties, months=months)


def test_a_widespread_well_recorded_species_is_included():
    assert classify(sig()).included is True


def test_a_single_county_one_off_is_excluded():
    v = classify(sig(occ=3, counties=1, months=1))
    assert v.included is False
    assert "county" in v.reason or "record" in v.reason


def test_rarity_alone_never_excludes_a_widespread_species():
    # The osprey case: comparatively few records would still be fine if it is seen everywhere.
    assert classify(sig(occ=60, counties=18, months=7)).included is True


def test_volume_alone_rescues_a_single_county_species():
    # A genuinely local but abundant species (a coastal plant, say) is encounterable where it lives.
    assert classify(sig(occ=5000, counties=1, months=5)).included is True


def test_an_authoritative_checklist_overrides_the_statistics_both_ways():
    # Dyntaxa/Artsdatabanken and friends are the real answer; the statistics are only a stand-in
    # until the ingest can reach them.
    assert classify(sig(occ=2, counties=1, months=1), status="native").included is True
    assert classify(sig(occ=99999, counties=21, months=12), status="alien").included is False


def test_unknown_checklist_status_falls_back_to_the_statistics():
    assert classify(sig(occ=3, counties=1, months=1), status=None).included is False
    assert classify(sig(occ=3, counties=1, months=1), status="unknown").included is False


def test_every_verdict_carries_a_reason():
    # A species dropped without a recorded reason cannot be argued with later.
    for s in [sig(), sig(occ=1, counties=1, months=1)]:
        assert classify(s).reason


def test_filter_species_partitions_and_preserves_order():
    rows = [sig(name="A"), sig(occ=1, counties=1, months=1, name="B"), sig(name="C")]
    kept, dropped = filter_species(rows)
    assert [k.scientific_name for k in kept] == ["A", "C"]
    assert [d.scientific_name for d in dropped] == ["B"]


def test_policy_is_data_not_magic_numbers():
    assert DEFAULT_POLICY.min_occurrences > 0
    assert DEFAULT_POLICY.min_counties > 0
    assert DEFAULT_POLICY.abundant_occurrences > DEFAULT_POLICY.min_occurrences


def test_a_stricter_policy_drops_more():
    from gbif.noise import Policy

    strict = Policy(min_occurrences=10_000, min_counties=15, abundant_occurrences=10**9)
    assert classify(sig(occ=1000, counties=10), policy=strict).included is False


# ── Regression guard against the curated set ─────────────────────────────────
# The 54 hand-curated Kronoberg species (T-019) are known-good: a human decided each one is
# genuinely encounterable. If a policy change starts eating them, the policy is wrong. This is the
# cheapest available check that "filter noise" has not become "filter species".

import json  # noqa: E402
import re  # noqa: E402
from collections import defaultdict  # noqa: E402

REPO = Path(__file__).resolve().parents[2]

# Taraxacum officinale has no GBIF presence data at all — dandelion is an apomictic aggregate that
# GBIF splits into microspecies, so the binomial never matches (T-163). Its absence here is that
# data gap surfacing, not the filter misjudging it.
KNOWN_ABSENT = {"Taraxacum officinale"}


def _sweden_signals():
    prof = defaultdict(lambda: {"occ": 0, "c": set(), "m": set()})
    for path in (REPO / "pipeline/data").glob("presence_*.json"):
        for row in json.loads(path.read_text()).get("records", []):
            p = prof[row["scientificName"]]
            p["occ"] += row.get("occurrences", 0)
            p["c"].add(row["county"])
            p["m"].update(row.get("activeMonths", []))
    return [SpeciesSignals(k, v["occ"], len(v["c"]), len(v["m"])) for k, v in prof.items()]


def test_the_curated_species_survive_the_filter():
    curated = set(
        re.findall(r"scientificName: '([^']+)'", (REPO / "lib/species/kronoberg.ts").read_text())
    )
    kept, _ = filter_species(_sweden_signals())
    survivors = {k.scientific_name for k in kept}
    lost = (curated - survivors) - KNOWN_ABSENT
    assert not lost, f"filter dropped hand-curated species: {sorted(lost)}"


def test_the_filter_removes_a_meaningful_share_without_gutting_the_list():
    # Both directions matter: a filter that drops nothing is not filtering, and one that drops
    # almost everything has stopped being a noise filter.
    rows = _sweden_signals()
    kept, dropped = filter_species(rows)
    share = len(dropped) / len(rows)
    assert 0.15 < share < 0.75, f"dropped {share:.0%} — policy needs review"
    assert len(kept) > 2000
