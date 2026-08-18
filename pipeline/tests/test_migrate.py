"""Deciding which migrations still need applying (T-176) — pure, no DB.

The live project's history is out of step with the repo: the same DDL was applied through the MCP
tool, which stamped its own timestamps, so six files' contents are applied under versions that do
not match their filenames. Meanwhile the 1.5 MB all-locales content seed has never run at all.

That means "pending" cannot be inferred from the filenames alone, and a tool that guessed wrong
would either re-run DDL or silently skip the one migration that matters. The decision is pure and
is tested here; only the psql call is not.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.migrate import (  # noqa: E402
    parse_migration_name,
    pending_versions,
    select_versions,
)


def test_parses_version_and_name():
    assert parse_migration_name("20260810000001_seed_species_content_all_locales.sql") == (
        "20260810000001",
        "seed_species_content_all_locales",
    )


def test_ignores_a_file_that_is_not_a_migration():
    assert parse_migration_name("README.md") is None
    assert parse_migration_name("no_version_prefix.sql") is None


def test_pending_is_what_the_database_has_never_seen():
    local = [("20260704000001", "a"), ("20260810000001", "b")]
    assert pending_versions(local, {"20260704000001"}) == [("20260810000001", "b")]


def test_pending_is_ordered_by_version_not_by_directory_listing():
    local = [("20260810000001", "late"), ("20260704000001", "early")]
    assert [v for v, _ in pending_versions(local, set())] == [
        "20260704000001",
        "20260810000001",
    ]


def test_nothing_pending_when_every_version_is_recorded():
    local = [("20260704000001", "a")]
    assert pending_versions(local, {"20260704000001"}) == []


def test_a_version_recorded_but_absent_locally_is_not_resurrected():
    # The live project carries stamps like 20260705183144 that no file matches. They are history,
    # not work to do, and must never be turned into something to apply.
    assert pending_versions([("20260704000001", "a")], {"20260705183144"}) == [
        ("20260704000001", "a")
    ]


# The plan run showed why a mode alone is not enough: seven migrations are pending, but six of them
# are already live under MCP-stamped versions and want `repair`, while exactly one — the 1.5 MB
# content seed — has genuinely never run and wants `apply`. Running either mode across all seven
# does the wrong thing to six of them.


def test_selecting_a_subset_of_pending_versions():
    pend = [("20260707000001", "a"), ("20260810000001", "b")]
    assert select_versions(pend, ["20260810000001"]) == [("20260810000001", "b")]


def test_selecting_nothing_means_everything_pending():
    pend = [("20260707000001", "a"), ("20260810000001", "b")]
    assert select_versions(pend, []) == pend


def test_a_version_that_is_not_pending_is_refused_not_ignored():
    # Silently skipping a typo'd version would report success having done nothing — the worst
    # outcome for a command whose whole purpose is knowing what ran.
    try:
        select_versions([("20260810000001", "b")], ["20260707000001"])
    except ValueError as err:
        assert "20260707000001" in str(err)
    else:
        raise AssertionError("expected a non-pending version to raise")


def test_selection_keeps_version_order_not_argument_order():
    pend = [("20260707000001", "a"), ("20260810000001", "b")]
    assert [v for v, _ in select_versions(pend, ["20260810000001", "20260707000001"])] == [
        "20260707000001",
        "20260810000001",
    ]
