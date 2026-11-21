"""Protection against real Postgres (T-337): the levels the column takes, and a county limit that
the county catalogue honours."""

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
    "20261121000002_species_protection.sql",
]


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, MIGRATIONS)
    conn.execute(
        "insert into public.regions (id, name) values ('SWE.8_1', 'Kalmar'), ('SWE.9_1', 'Kronoberg') "
        "on conflict do nothing"
    )
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) values "
        "('ramsons', 'Allium ursinum', 'Ramsons', 'plant', 'common'), "
        "('gbif:5219616', 'Erinaceus europaeus', 'Hedgehog', 'mammal', 'common')"
    )
    conn.execute(
        "insert into public.species_presence (species_id, region_id, active_months, occurrences) values "
        "('ramsons', 'SWE.8_1', '{5}', 9), ('ramsons', 'SWE.9_1', '{5}', 8), "
        "('gbif:5219616', 'SWE.9_1', '{6}', 7)"
    )
    conn.execute(
        "update public.species set legal_status = 'protected', protection = 'limited', "
        "protection_regions = '{SWE.8_1}' where id = 'ramsons'"
    )
    conn.execute(
        "update public.species set legal_status = 'protected', protection = 'reinforced' "
        "where id = 'gbif:5219616'"
    )
    yield conn
    conn.close()


def catalogue(db, region):
    return {
        r[0]: r[1:]
        for r in db.execute(
            f"select id, legal_status, protection, protection_local from public.region_catalogue('{region}', 'en')"
        ).fetchall()
    }


def test_a_nationwide_protection_shows_everywhere(db):
    assert catalogue(db, "SWE.9_1")["gbif:5219616"] == ("protected", "reinforced", False)


def test_a_county_limited_protection_shows_only_in_its_counties(db):
    assert catalogue(db, "SWE.8_1")["ramsons"] == ("protected", "limited", True)
    assert catalogue(db, "SWE.9_1")["ramsons"] == (None, None, False)


def test_an_unknown_level_is_refused(db):
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute("update public.species set protection = 'total'")


def test_counties_need_a_level(db):
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute("update public.species set protection = null where id = 'ramsons'")
