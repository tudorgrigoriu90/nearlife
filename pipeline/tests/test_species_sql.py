"""How the species upsert treats common_name (T-210)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.supabase_load import species_sql  # noqa: E402


def test_with_fresh_names_gbif_rows_follow_the_vernacular_data():
    sql = species_sql(have_names=True)
    assert "when left(public.species.id, 5) = 'gbif:' then excluded.common_name" in sql


def test_without_names_gbif_rows_only_lose_their_binomial_copies():
    # A run that skipped the name fetch must not erase every name it does not have this time.
    sql = species_sql(have_names=False)
    assert "then excluded.common_name" not in sql
    assert "nullif(public.species.common_name, public.species.scientific_name)" in sql


def test_curated_rows_always_keep_their_hand_written_name():
    for have_names in (True, False):
        assert "else coalesce(public.species.common_name, excluded.common_name) end" in species_sql(have_names)
