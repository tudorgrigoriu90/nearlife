"""Moving home county once a year (T-349 · review F-09), against real Postgres."""

import psycopg
import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

UPSERT = (
    "insert into public.profiles (user_id, home_region) values (%s, %s) "
    "on conflict (user_id) do update set home_region = excluded.home_region"
)


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, ["20260704000001_profiles_and_collection.sql", "20261029000001_free_catch_enforcement.sql"])
    for name in ("20261119000009_notif_prefs.sql", "20261119000011_home_move.sql"):
        sql = (MIGRATIONS_DIR / name).read_text(encoding="utf-8")
        if name.endswith("notif_prefs.sql"):
            sql = sql.split("-- push_due_users gains")[0]  # the grants, without the push tables
        conn.execute(sql)
    yield conn
    conn.close()


def moved_at(conn, user):
    return conn.execute("select home_region_moved_at from public.profiles where user_id = %s", (user,)).fetchone()[0]


def test_the_first_county_is_free_and_resending_it_is_not_a_move(db):
    u = new_user(db)
    with as_user(db, u):
        db.execute(UPSERT, (u, "SWE.9_1"))
        db.execute(UPSERT, (u, "SWE.9_1"))
    assert moved_at(db, u) is None


def test_one_move_a_year_and_the_second_is_refused_with_the_next_date(db):
    u = new_user(db)
    with as_user(db, u):
        db.execute(UPSERT, (u, "SWE.9_1"))
        db.execute(UPSERT, (u, "SWE.13_1"))
        with pytest.raises(psycopg.errors.RaiseException, match="home_move_limit"):
            db.execute(UPSERT, (u, "SWE.1_1"))
    assert moved_at(db, u) is not None
    assert db.execute("select home_region from public.profiles where user_id = %s", (u,)).fetchone()[0] == "SWE.13_1"


def test_a_year_later_the_next_move_is_allowed(db):
    u = new_user(db)
    with as_user(db, u):
        db.execute(UPSERT, (u, "SWE.9_1"))
        db.execute(UPSERT, (u, "SWE.13_1"))
    db.execute("update public.profiles set home_region_moved_at = now() - interval '366 days' where user_id = %s", (u,))
    with as_user(db, u):
        db.execute(UPSERT, (u, "SWE.1_1"))


def test_a_user_cannot_reset_the_date(db):
    u = new_user(db)
    with as_user(db, u):
        db.execute(UPSERT, (u, "SWE.9_1"))
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            db.execute("update public.profiles set home_region_moved_at = null where user_id = %s", (u,))
