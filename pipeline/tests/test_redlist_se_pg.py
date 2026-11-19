"""Sweden's Red List category against real Postgres (T-332 · review I-35): the column takes only
the codes the card shows, and the county catalogue returns it beside the worldwide one."""

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
]


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, MIGRATIONS)
    conn.execute("insert into public.regions (id, name) values ('SWE.9_1', 'Kronoberg') on conflict do nothing")
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) values "
        "('gbif:1', 'Lutra lutra', 'Otter', 'mammal', 'common'), "
        "('gbif:2', 'Erithacus rubecula', 'Robin', 'bird', 'common')"
    )
    conn.execute(
        "insert into public.species_presence (species_id, region_id, active_months, occurrences) values "
        "('gbif:1', 'SWE.9_1', '{1,2}', 5), ('gbif:2', 'SWE.9_1', '{4,5}', 50)"
    )
    yield conn
    conn.close()


def test_the_catalogue_returns_the_swedish_category_beside_the_worldwide_one(db):
    db.execute("update public.species set iucn_status = 'NT', redlist_se = 'VU' where id = 'gbif:1'")
    rows = db.execute(
        "select id, iucn_status, redlist_se from public.region_catalogue('SWE.9_1', 'sv') order by id"
    ).fetchall()
    assert rows == [("gbif:1", "NT", "VU"), ("gbif:2", None, None)]


@pytest.mark.parametrize("code", ["DD", "LC", "EX"])
def test_a_code_the_card_does_not_show_is_refused(db, code):
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute("update public.species set redlist_se = %s where id = 'gbif:1'", (code,))


def test_regionally_extinct_is_kept(db):
    db.execute("update public.species set redlist_se = 'RE' where id = 'gbif:2'")
