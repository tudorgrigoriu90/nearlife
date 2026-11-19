"""Community totals: signed-in callers only, and an index range instead of a per-row function
(T-305 · review B-56)."""

import psycopg
import pytest

from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20260707000001_production_species_tables.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000005_community_impact.sql",
    "20261119000003_community_impact_range.sql",
]


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, MIGRATIONS)
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) "
        "values ('moose', 'Alces alces', 'Moose', 'mammal', 'common')"
    )
    yield conn
    conn.close()


def pledge(conn, at: str, kind: str = "give"):
    u = new_user(conn)
    conn.execute(
        "insert into public.collection (user_id, species_id, spotted_at, helped_at, helped_kind) "
        "values (%s, 'moose', %s, %s, %s)",
        (u, at, at, kind),
    )


@pytest.mark.parametrize(
    "now,inside,outside",
    [
        # 00:30 on 1 December in Stockholm is winter; 23:30 on 30 November is autumn.
        ("2026-12-10 12:00+00", "2026-11-30 23:30+00", "2026-11-30 22:30+00"),
        ("2027-02-28 12:00+00", "2026-12-01 00:00+01", "2027-03-01 00:00+01"),
        ("2026-07-15 12:00+00", "2026-06-01 00:00+02", "2026-05-31 23:59+02"),
    ],
)
def test_the_range_counts_exactly_the_season_of_season_key(db, now, inside, outside):
    pledge(db, inside, "give")
    pledge(db, outside, "protect")
    row = db.execute(
        "select season, helpers, pledges, give, protect from public.community_impact_at(%s)", (now,)
    ).fetchone()
    expected_key = db.execute("select public.season_key(%s::timestamptz)", (now,)).fetchone()[0]
    assert row == (expected_key, 1, 1, 1, 0)
    assert db.execute("select public.season_key(%s::timestamptz)", (inside,)).fetchone()[0] == expected_key
    assert db.execute("select public.season_key(%s::timestamptz)", (outside,)).fetchone()[0] != expected_key


def test_an_empty_season_is_one_row_of_zeros(db):
    row = db.execute("select helpers, pledges from public.community_impact()").fetchone()
    assert row == (0, 0)


def test_signed_in_users_may_read_it_anonymous_callers_may_not(db):
    u = new_user(db)
    with as_user(db, u):
        assert db.execute("select pledges from public.community_impact()").fetchone() is not None
    db.execute("set role anon")
    try:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            db.execute("select * from public.community_impact()")
    finally:
        db.execute("reset role")


def test_the_season_is_read_by_index(db):
    db.execute("set enable_seqscan = off")
    plan = "\n".join(
        r[0] for r in db.execute(
            "explain select count(*) from public.collection "
            "where helped_at >= now() - interval '1 month' and helped_at < now()"
        ).fetchall()
    )
    assert "collection_helped_at_idx" in plan
