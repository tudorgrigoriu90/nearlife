"""Merged species stay merged across GBIF ingests (T-373)."""

from gbif.aliases import apply_aliases

OLD, NEW = "gbif:2688495", "gbif:8190643"


def sp(sid, in_catalogue=True):
    return {"id": sid, "in_catalogue": in_catalogue}


def pres(sid, region, counts, months):
    return {"species_id": sid, "region_id": region, "occurrences": sum(counts), "month_counts": counts, "active_months": months}


def test_an_alias_never_reenters_the_catalogue_and_its_records_add_to_the_accepted_species():
    species = [sp(OLD), sp(NEW, in_catalogue=False)]
    presence = [pres(OLD, "SWE.9_1", [1] * 12, [1, 2]), pres(NEW, "SWE.9_1", [2] * 12, [2, 3]), pres(OLD, "SWE.15_1", [5] * 12, [6])]
    species, presence = apply_aliases(species, presence, {OLD: NEW})
    assert {s["id"]: s["in_catalogue"] for s in species} == {OLD: False, NEW: True}
    by_region = {p["region_id"]: p for p in presence}
    assert set(p["species_id"] for p in presence) == {NEW}
    assert by_region["SWE.9_1"]["occurrences"] == 36
    assert by_region["SWE.9_1"]["month_counts"] == [3] * 12
    assert by_region["SWE.9_1"]["active_months"] == [1, 2, 3]
    assert by_region["SWE.15_1"]["occurrences"] == 60  # only the alias had records there


def test_a_missing_monthly_count_does_not_erase_the_others():
    presence = [pres(OLD, "SWE.9_1", [1] * 12, [1]), {**pres(NEW, "SWE.9_1", [0] * 12, [1]), "month_counts": None, "occurrences": 4}]
    _, presence = apply_aliases([], presence, {OLD: NEW})
    assert presence[0]["month_counts"] == [1] * 12
    assert presence[0]["occurrences"] == 16


def test_no_aliases_changes_nothing():
    species, presence = [sp(NEW)], [pres(NEW, "SWE.9_1", [1] * 12, [1])]
    assert apply_aliases(species, presence, {}) == (species, presence)
