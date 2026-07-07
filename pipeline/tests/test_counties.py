"""Tests for the Swedish county list."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.counties import COUNTY_NAME_BY_GID, SWEDISH_COUNTIES  # noqa: E402


def test_has_all_21_counties():
    assert len(SWEDISH_COUNTIES) == 21


def test_gids_are_unique_and_well_formed():
    gids = [c["gid"] for c in SWEDISH_COUNTIES]
    assert len(set(gids)) == 21
    for gid in gids:
        assert re.fullmatch(r"SWE\.\d+_1", gid), gid


def test_names_are_unique_and_non_empty():
    names = [c["name"] for c in SWEDISH_COUNTIES]
    assert len(set(names)) == 21
    assert all(n.strip() for n in names)


def test_name_lookup_matches_list():
    assert COUNTY_NAME_BY_GID["SWE.9_1"] == "Kronoberg"
    assert len(COUNTY_NAME_BY_GID) == 21
