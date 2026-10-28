"""The content loader's tolerance for rows whose species is missing (T-210)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.supabase_load_content import MAX_ORPHAN_SHARE, check_orphans  # noqa: E402


def test_a_few_orphans_are_reported_not_fatal():
    check_orphans(10_000, {"gbif:1"}, 10)  # 0.1% — loads the rest


def test_none_is_fine():
    check_orphans(10_000, set(), 0)


def test_many_orphans_mean_mismatched_runs_and_refuse_the_load():
    with pytest.raises(SystemExit, match="different runs"):
        check_orphans(10_000, {"gbif:1", "gbif:2"}, int(10_000 * MAX_ORPHAN_SHARE) + 1)
