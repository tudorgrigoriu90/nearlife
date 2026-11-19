"""Legal status against real Postgres (T-336): the column takes only the two statuses, and the
county catalogue returns it."""

import psycopg
import pytest

from pg_harness import connect, fresh, needs_pg

pytestmark = needs_pg

MIGRATIONS = [
    "20260707000001_production_species_tables.sql",
    "20260707000003_regions_and_presence.sql",
    "20261029000002_species_media.sql",
    "20261030000001_species_catch_habitats.sql",
    "20261031000001_species_in_catalogue.sql",
    "20261113000001_presence_month_counts.sql",
    "20261113000002_species_iucn_status.sql",
    "20261119000007_species_redlist_se.sql",
    "20261119000008_species_legal_status.sql",
]


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, MIGRATIONS)
    conn.execute("insert into public.regions (id, name) values ('SWE.9_1', 'Kronoberg') on conflict do nothing")
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) values "
        "('gbif:3170247', 'Asclepias syriaca', 'Common milkweed', 'plant', 'common')"
    )
    conn.execute(
        "insert into public.species_presence (species_id, region_id, active_months, occurrences) "
        "values ('gbif:3170247', 'SWE.9_1', '{7}', 2)"
    )
    yield conn
    conn.close()


def test_the_catalogue_returns_the_legal_status(db):
    db.execute("update public.species set legal_status = 'invasive'")
    row = db.execute("select legal_status, redlist_se from public.region_catalogue('SWE.9_1', 'sv')").fetchone()
    assert row == ("invasive", None)


def test_an_unknown_status_is_refused(db):
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute("update public.species set legal_status = 'banned'")
