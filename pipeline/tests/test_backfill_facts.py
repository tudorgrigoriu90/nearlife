"""Backfilling the facts the extract batch lost (T-259)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backfill_facts import FILL_SQL, PENDING_SQL, fill_rows, locale_order  # noqa: E402


def test_swedish_and_english_go_first():
    assert locale_order(["ro", "en", "ar", "sv"]) == ["sv", "en", "ar", "ro"]


def test_only_empty_slots_are_asked_for_and_written():
    assert "(c.fact is null or c.fact = '')" in PENDING_SQL
    assert "and (fact is null or fact = '')" in FILL_SQL


def test_no_article_writes_nothing():
    ids = {"Pica pica": "gbif:1", "Nonexistent name": "gbif:2"}
    rows = fill_rows("sv", ids, {"Pica pica": "Skata är en fågel.", "Nonexistent name": None})
    assert rows == [{"species_id": "gbif:1", "locale": "sv", "fact": "Skata är en fågel."}]
