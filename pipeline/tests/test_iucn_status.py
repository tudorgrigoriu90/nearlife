"""Worldwide threat status for the card (T-263)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_iucn_status import statuses_from_rows  # noqa: E402

SQL = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261113000002_species_iucn_status.sql"
).read_text()


def row(name, item):
    return {"name": {"value": name}, "status": {"value": f"http://www.wikidata.org/entity/{item}"}}


def test_only_threatened_categories_are_kept():
    rows = [
        row("Anguilla anguilla", "Q219127"),  # critically endangered
        row("Fratercula arctica", "Q278113"),  # vulnerable
        row("Parus major", "Q211005"),  # least concern: no badge
        row("Data poor", "Q3245245"),  # data deficient: no badge
    ]
    assert statuses_from_rows(rows) == {"Anguilla anguilla": "CR", "Fratercula arctica": "VU"}


def test_two_categories_for_one_name_keep_the_more_threatened():
    rows = [row("Aythya ferina", "Q719675"), row("Aythya ferina", "Q278113")]
    assert statuses_from_rows(rows) == {"Aythya ferina": "VU"}


def test_the_column_takes_only_known_categories_and_the_catalogue_returns_it():
    assert "iucn_status in ('NT', 'VU', 'EN', 'CR', 'EW', 'EX')" in SQL
    assert "iucn_status      text" in SQL and "s.iucn_status" in SQL
    assert "p.month_counts" in SQL and "order by p.occurrences desc, s.id" in SQL
    assert "security invoker" in SQL
