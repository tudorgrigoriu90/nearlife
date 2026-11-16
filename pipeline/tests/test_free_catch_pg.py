"""Free catches are counted once, under the exact statement the app sends (T-266 · review B-01).

supabase-js `.upsert(row, { onConflict: 'user_id,species_id' })` is an INSERT … ON CONFLICT DO
UPDATE. Postgres fires the BEFORE INSERT row trigger for it even when the row exists, then the
BEFORE UPDATE trigger on the conflict, so a trigger that counts on INSERT counts twice.
"""

import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261116000001_free_catch_count_once.sql",
]

# The statement PostgREST runs for the app's upsert (lib/supabaseCollectionStore.ts upsertOne).
UPSERT = """
insert into public.collection
  (user_id, species_id, spotted_at, caught_at, helped_at, helped_kind, prime_bonus)
values (%s, %s, %s, %s, %s, %s, false)
on conflict (user_id, species_id) do update set
  spotted_at = excluded.spotted_at, caught_at = excluded.caught_at,
  helped_at = excluded.helped_at, helped_kind = excluded.helped_kind,
  prime_bonus = excluded.prime_bonus
"""
T = "2026-11-15T10:00:00Z"


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, MIGRATIONS)
    yield conn
    conn.close()


def used(conn, user: str) -> int:
    row = conn.execute("select free_catches_used from public.profiles where user_id = %s", (user,)).fetchone()
    return row[0] if row else 0


def upsert(conn, user, species, spotted=T, caught=None, helped=None, kind=None):
    with as_user(conn, user):
        conn.execute(UPSERT, (user, species, spotted, caught, helped, kind))


def test_spot_then_catch_then_pledge_costs_one_catch(db):
    u = new_user(db)
    upsert(db, u, "a")
    assert used(db, u) == 0
    upsert(db, u, "a", caught=T)
    assert used(db, u) == 1
    upsert(db, u, "a", caught=T)  # the same row sent again
    assert used(db, u) == 1
    upsert(db, u, "a", caught=T, helped=T, kind="give")
    assert used(db, u) == 1


def test_a_first_upsert_that_is_already_caught_counts_once(db):
    u = new_user(db)
    upsert(db, u, "a", caught=T)
    assert used(db, u) == 1


def test_three_species_are_free_and_the_fourth_is_refused(db):
    u = new_user(db)
    for s in ("a", "b", "c"):
        upsert(db, u, s)
        upsert(db, u, s, caught=T)
        upsert(db, u, s, caught=T, helped=T, kind="protect")
    assert used(db, u) == 3
    upsert(db, u, "d")  # spotting stays free
    with pytest.raises(Exception, match="free_catch_limit"):
        upsert(db, u, "d", caught=T)
    upsert(db, u, "a", caught=T, helped=T, kind="give")  # re-saving a caught row still works


def test_a_catch_from_an_earlier_season_caught_again_counts(db):
    u = new_user(db)
    upsert(db, u, "a", caught="2025-07-01T10:00:00Z")
    db.execute("update public.profiles set free_catches_used = 0, free_catch_season = '2025-summer'")
    upsert(db, u, "a", caught=T)
    assert used(db, u) == 1


def test_full_game_owners_are_never_counted_or_refused(db):
    u = new_user(db)
    db.execute("insert into public.profiles (user_id, full_game) values (%s, true)", (u,))
    for s in "abcde":
        upsert(db, u, s, caught=T)
    assert used(db, u) == 0



def test_the_migration_repairs_counters_the_double_count_inflated():
    conn = connect()
    fresh(conn, MIGRATIONS[:2])
    u = new_user(conn)
    now = conn.execute("select now()").fetchone()[0]
    upsert(conn, u, "a", spotted=now)
    upsert(conn, u, "a", spotted=now, caught=now)
    assert used(conn, u) == 2  # the old trigger's double count
    conn.execute((MIGRATIONS_DIR / MIGRATIONS[2]).read_text(encoding="utf-8"))
    assert used(conn, u) == 1
    conn.close()
