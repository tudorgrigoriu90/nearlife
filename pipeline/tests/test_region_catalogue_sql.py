"""Static guards on region_catalogue (T-057): recreated with catch habitats, still a public read
that runs with the caller's rights."""

from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"
SQL = (MIGRATIONS / "20261030000005_region_catalogue_habitats.sql").read_text(encoding="utf-8")


def test_returns_catch_habitats():
    assert "catch_habitats   text[]" in SQL and "s.catch_habitats" in SQL


def test_keeps_invoker_rights_a_pinned_search_path_and_the_grant():
    assert "security invoker" in SQL and "set search_path = ''" in SQL
    assert "grant execute on function public.region_catalogue(text, text) to anon, authenticated;" in SQL


def test_keeps_the_total_order_that_paging_relies_on():
    assert "order by p.occurrences desc, s.id" in SQL


LATEST = (MIGRATIONS / "20261113000001_presence_month_counts.sql").read_text(encoding="utf-8")


def test_returns_month_counts_and_keeps_everything_else():
    # T-261: the recreated function must still carry every rule above.
    assert "month_counts     integer[]" in LATEST and "p.month_counts" in LATEST
    assert "catch_habitats   text[]" in LATEST and "s.catch_habitats" in LATEST
    assert "security invoker" in LATEST and "set search_path = ''" in LATEST
    assert "grant execute on function public.region_catalogue(text, text) to anon, authenticated;" in LATEST
    assert "order by p.occurrences desc, s.id" in LATEST
    assert "cardinality(month_counts) = 12" in LATEST
