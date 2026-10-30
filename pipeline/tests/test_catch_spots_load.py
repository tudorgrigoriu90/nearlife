"""T-048/T-049: loading catch spots, and the rule that a flagged spot is never shown."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from osm.load import refresh_allowed, rows  # noqa: E402

SQL = (Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261030000002_catch_spots.sql").read_text()


def test_a_normal_refresh_loads():
    assert refresh_allowed(existing=600, incoming=590) == (True, "")
    assert refresh_allowed(existing=0, incoming=10) == (True, "")


def test_a_collapsed_or_empty_fetch_is_refused():
    assert refresh_allowed(existing=600, incoming=100)[0] is False
    assert refresh_allowed(existing=0, incoming=0)[0] is False


def test_rows_take_the_county_from_the_file():
    doc = {"meta": {"region_id": "SWE.9_1"}, "spots": [{"id": "n1", "flags": []}]}
    assert rows(doc) == [{"id": "n1", "flags": [], "region_id": "SWE.9_1"}]


def test_users_can_only_ever_read_unflagged_spots():
    assert "using (cardinality(flags) = 0)" in SQL
    assert "revoke insert, update, delete on public.catch_spots from anon, authenticated;" in SQL


def test_the_flag_list_matches_the_pipeline_rules():
    # Every flag the pipeline can write must be allowed by the table, or a load would fail.
    for flag in ("private", "major_road", "water", "reserve", "military"):
        assert f"'{flag}'" in SQL
