"""Per-species habitat from GBIF species profiles (T-191).

T-190 widened the mammal habitat hint so it stopped telling readers to look for otters in meadows,
but a hint naming every habitat a taxon might occupy is vague by construction — it is the average
of a badger and a seal. GBIF publishes the real answer per species via /species/{key}/speciesProfiles.

Profiles come from several checklist datasets and disagree. They are OR-ed rather than voted on: a
species one authority calls freshwater almost certainly *is* found in fresh water, and the cost of
a false "aquatic" (a slightly odd hint) is far below the cost of a false "terrestrial" (telling
someone to look for an otter in a meadow, which is the bug this exists to fix).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.species_profile import is_aquatic, parse_species_profile  # noqa: E402


def _p(*profiles):
    return {"results": list(profiles)}


def test_reads_the_three_realm_flags():
    got = parse_species_profile(_p({"marine": False, "freshwater": True, "terrestrial": False}))
    assert got == {"marine": False, "freshwater": True, "terrestrial": False}


def test_disagreeing_profiles_are_combined_not_voted_on():
    got = parse_species_profile(
        _p({"freshwater": True, "terrestrial": False}, {"freshwater": False, "terrestrial": True})
    )
    assert got["freshwater"] is True
    assert got["terrestrial"] is True


def test_missing_flags_default_to_false_rather_than_unknown():
    assert parse_species_profile(_p({})) == {
        "marine": False,
        "freshwater": False,
        "terrestrial": False,
    }


def test_an_empty_payload_is_all_false():
    assert parse_species_profile({})["freshwater"] is False


def test_is_aquatic_covers_both_salt_and_fresh_water():
    assert is_aquatic({"marine": True, "freshwater": False, "terrestrial": True})
    assert is_aquatic({"marine": False, "freshwater": True, "terrestrial": False})


def test_a_species_in_water_and_on_land_still_counts_as_aquatic():
    # An otter is terrestrial too. The aquatic hint is the one that would surprise a reader into
    # looking in the right place, so it wins when both are true.
    assert is_aquatic({"marine": False, "freshwater": True, "terrestrial": True})


def test_a_purely_terrestrial_species_is_not_aquatic():
    assert not is_aquatic({"marine": False, "freshwater": False, "terrestrial": True})


def test_no_profile_at_all_is_not_aquatic():
    # Absent data must fall back to the taxon default, never assert water.
    assert not is_aquatic({})
