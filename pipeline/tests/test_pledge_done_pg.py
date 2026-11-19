"""A pledge can be marked done (T-344 · review F-08), against real Postgres: the owner writes it
with the same upsert the app sends, and a "done" without a pledge is refused."""

import psycopg
import pytest

from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261116000001_free_catch_count_once.sql",
    "20261119000010_pledge_done.sql",
]

UPSERT = """
insert into public.collection
  (user_id, species_id, spotted_at, caught_at, helped_at, helped_kind, prime_bonus, helped_done_at)
values (%s, 'owl', '2026-11-01T10:00:00Z', null, %s, %s, false, %s)
on conflict (user_id, species_id) do update set
  helped_at = excluded.helped_at, helped_kind = excluded.helped_kind, helped_done_at = excluded.helped_done_at
"""


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, MIGRATIONS)
    yield conn
    conn.close()


def test_the_owner_marks_a_pledge_done(db):
    u = new_user(db)
    with as_user(db, u):
        db.execute(UPSERT, (u, "2026-11-01T10:00:00Z", "give", None))
        db.execute(UPSERT, (u, "2026-11-01T10:00:00Z", "give", "2026-11-05T10:00:00Z"))
    assert db.execute("select helped_done_at is not null from public.collection").fetchone()[0] is True


def test_done_without_a_pledge_is_refused(db):
    u = new_user(db)
    with as_user(db, u), pytest.raises(psycopg.errors.CheckViolation):
        db.execute(UPSERT, (u, None, None, "2026-11-05T10:00:00Z"))
