"""The hazard flags of T-326 (review I-22) against real Postgres: the table accepts every flag the
pipeline writes and nothing else, and a spot carrying any of them is invisible to users."""

import psycopg
import pytest

from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20260707000001_production_species_tables.sql",
    "20260707000003_regions_and_presence.sql",
    "20261030000002_catch_spots.sql",
    "20261119000006_catch_spot_hazards.sql",
]


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, MIGRATIONS)
    conn.execute("insert into public.regions (id, name) values ('SWE.9_1', 'Kronoberg') on conflict do nothing")
    yield conn
    conn.close()


def spot(conn, sid, flags):
    conn.execute(
        "insert into public.catch_spots (id, region_id, kind, habitat, lat, lon, flags) "
        "values (%s, 'SWE.9_1', 'viewpoint', 'land', 56.9, 14.8, %s)",
        (sid, flags),
    )


@pytest.mark.parametrize("flag", ["cliff", "quarry", "landfill", "airport", "reserve", "major_road"])
def test_a_flagged_spot_is_stored_but_never_shown(db, flag):
    spot(db, "n-ok", [])
    spot(db, "n-bad", [flag])
    with as_user(db, new_user(db)):
        seen = [r[0] for r in db.execute("select id from public.catch_spots order by id")]
    assert seen == ["n-ok"]


def test_a_flag_the_pipeline_does_not_write_is_refused(db):
    with pytest.raises(psycopg.errors.CheckViolation):
        spot(db, "n-x", ["volcano"])
