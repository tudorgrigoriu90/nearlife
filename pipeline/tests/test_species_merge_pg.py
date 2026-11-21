"""Merging a duplicate species into GBIF's accepted key (T-373), against real Postgres."""

import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20260707000001_production_species_tables.sql",
    "20260707000003_regions_and_presence.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000002_species_media.sql",
    "20261030000001_species_catch_habitats.sql",
    "20261031000001_species_in_catalogue.sql",
    "20261105000001_species_sounds.sql",
    "20261113000001_presence_month_counts.sql",
    "20261116000001_free_catch_count_once.sql",
    "20261118000001_fact_sources.sql",
    "20261118000004_server_limits.sql",
    "20261119000001_content_reports.sql",
    "20261119000002_recognitions.sql",
    "20261119000010_pledge_done.sql",
    "20261121000001_species_aliases.sql",
]

OLD, NEW = "gbif:2688495", "gbif:8190643"


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, MIGRATIONS[:1])
    # The send log, without the cron part that needs Supabase's pg_net (as in test_notification_kind_pg).
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    for name in MIGRATIONS[1:]:
        conn.execute((MIGRATIONS_DIR / name).read_text(encoding="utf-8"))
    conn.execute("insert into public.regions (id, name) values ('SWE.9_1', 'Kronoberg')")
    for sid, key, name in ((OLD, 2688495, "northern firmoss"), (NEW, 8190643, "Northern Firmoss")):
        conn.execute(
            "insert into public.species (id, scientific_name, common_name, category, rarity, gbif_key, in_catalogue) "
            "values (%s, 'Huperzia selago', %s, 'plant', 'common', %s, true)",
            (sid, name, key),
        )
    yield conn
    conn.close()


def presence(conn, sid, counts, months):
    conn.execute(
        "insert into public.species_presence (region_id, species_id, active_months, occurrences, month_counts) "
        "values ('SWE.9_1', %s, %s, %s, %s)",
        (sid, months, sum(counts), counts),
    )


def merge(conn):
    conn.execute("select public.merge_species(%s, %s)", (OLD, NEW))


def test_presence_adds_up_and_the_old_key_leaves_the_catalogue(db):
    presence(db, OLD, [1] * 12, [1, 2])
    presence(db, NEW, [2] * 12, [2, 3])
    merge(db)
    row = db.execute(
        "select occurrences, month_counts, active_months from public.species_presence where species_id = %s", (NEW,)
    ).fetchone()
    assert row == (36, [3] * 12, [1, 2, 3])
    assert db.execute("select count(*) from public.species_presence where species_id = %s", (OLD,)).fetchone()[0] == 0
    assert db.execute("select in_catalogue from public.species where id = %s", (OLD,)).fetchone()[0] is False
    assert db.execute("select species_id from public.species_aliases where alias_id = %s", (OLD,)).fetchone()[0] == NEW


def test_a_user_with_both_keeps_one_row_and_no_catch_is_spent_twice(db):
    u = new_user(db)
    with as_user(db, u):
        db.execute("insert into public.collection (user_id, species_id, spotted_at) values (%s, %s, now() - interval '3 days')", (u, NEW))
        db.execute("insert into public.collection (user_id, species_id, spotted_at, caught_at) values (%s, %s, now() - interval '1 day', now())", (u, OLD))
    used = lambda: db.execute("select free_catches_used from public.profiles where user_id = %s", (u,)).fetchone()[0]  # noqa: E731
    before = used()
    merge(db)
    rows = db.execute(
        "select species_id, caught_at is not null, spotted_at < now() - interval '2 days' from public.collection where user_id = %s", (u,)
    ).fetchall()
    assert rows == [(NEW, True, True)]  # the catch kept, the earlier sighting kept
    assert used() == before


def test_other_users_rows_and_recognitions_follow(db):
    u, v = new_user(db), new_user(db)
    with as_user(db, u):
        db.execute("insert into public.collection (user_id, species_id, spotted_at) values (%s, %s, now())", (u, OLD))
    # Recognitions are written through an RPC; the rows are set up directly here.
    for user, sid in ((u, OLD), (v, OLD), (v, NEW)):
        db.execute("insert into public.recognitions (user_id, species_id) values (%s, %s)", (user, sid))
    merge(db)
    assert db.execute("select species_id from public.collection where user_id = %s", (u,)).fetchall() == [(NEW,)]
    assert db.execute("select count(*) from public.recognitions where species_id = %s", (OLD,)).fetchone()[0] == 0
    assert db.execute("select count(*) from public.recognitions where user_id = %s", (v,)).fetchone()[0] == 1


def test_a_phone_writing_the_old_id_lands_on_the_new_one(db):
    merge(db)
    u = new_user(db)
    with as_user(db, u):
        db.execute(
            "insert into public.collection (user_id, species_id, spotted_at) values (%s, %s, now()) "
            "on conflict (user_id, species_id) do update set spotted_at = excluded.spotted_at",
            (u, OLD),
        )
        db.execute(
            "insert into public.collection (user_id, species_id, spotted_at) values (%s, %s, now()) "
            "on conflict (user_id, species_id) do update set spotted_at = excluded.spotted_at",
            (u, OLD),
        )
    assert db.execute("select species_id from public.collection where user_id = %s", (u,)).fetchall() == [(NEW,)]


def test_content_fills_only_what_the_accepted_key_lacks(db):
    row = "insert into public.species_content (species_id, locale, common_name, fact, when_how, give, protect) values (%s, 'sv', %s, %s, 'w', 'g', 'p')"
    db.execute(row, (OLD, "lopplummer", "gammal"))
    db.execute(row, (NEW, None, "ny"))
    merge(db)
    assert db.execute(
        "select common_name, fact from public.species_content where species_id = %s and locale = 'sv'", (NEW,)
    ).fetchone() == ("lopplummer", "ny")


def test_only_the_service_role_may_merge(db):
    u = new_user(db)
    with as_user(db, u):
        with pytest.raises(Exception, match="permission denied"):
            merge(db)
