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

from db.migrate import parse_migration_name, pending_versions  # noqa: E402


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
