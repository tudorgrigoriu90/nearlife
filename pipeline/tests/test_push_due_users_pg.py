"""The users due a notification this run, chosen in SQL (T-316 · review B-51).

The sender read every opted-in user's devices, profile, whole collection and two days of log
each hour, then matched rows to users in memory, though most users are not due that hour.
public.push_due_users returns only the due ones, with what the planner needs aggregated.
"""

import json
from pathlib import Path

import psycopg
import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "send_slots.json").read_text())
HOURS = FIXTURE["allowedHours"]

BASE = [
    "20260704000001_profiles_and_collection.sql",
    "20260707000001_production_species_tables.sql",
    "20261029000001_free_catch_enforcement.sql",
]
DUE = "20261119000004_push_due_users.sql"


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, BASE)
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    conn.execute((MIGRATIONS_DIR / DUE).read_text(encoding="utf-8"))
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) "
        "values ('moose', 'Alces alces', 'Moose', 'mammal', 'common')"
    )
    yield conn
    conn.close()


def user_with_device(conn, user_id=None, region="SWE.9_1"):
    if user_id is None:
        user_id = new_user(conn)
    else:
        conn.execute("insert into auth.users (id) values (%s)", (user_id,))
    conn.execute("insert into public.profiles (user_id, home_region) values (%s, %s)", (user_id, region))
    conn.execute(
        "insert into public.push_devices (user_id, token, platform, locale) values (%s, %s, 'android', 'sv')",
        (user_id, f"tok-{user_id}"),
    )
    return user_id


def due(conn, at, **kw):
    rows = conn.execute(
        "select user_id::text, home_region, devices, collected, sent_at "
        "from public.push_due_users(%s, %s, %s, %s, %s) order by user_id",
        (at, HOURS, 20, kw.get("only_user"), kw.get("ignore_slot", False)),
    ).fetchall()
    return rows


def test_the_sql_slot_is_the_apps_slot(db):
    for user_id, hour in FIXTURE["slots"].items():
        got = db.execute("select public.push_slot_hour(%s, %s)", (user_id, HOURS)).fetchone()[0]
        assert got == hour, user_id


def test_due_once_the_slot_has_arrived_and_not_before(db):
    user_id, hour = next((u, h) for u, h in FIXTURE["slots"].items() if 10 <= h <= 18)
    user_with_device(db, user_id)
    # Stockholm is UTC+1 in January.
    before = f"2027-01-15 {hour - 2:02d}:30+00"  # an hour before the slot, local
    at_slot = f"2027-01-15 {hour - 1:02d}:30+00"
    later = f"2027-01-15 {hour + 1:02d}:30+00"
    assert due(db, before) == []
    assert [r[0] for r in due(db, at_slot)] == [user_id]
    assert [r[0] for r in due(db, later)] == [user_id]  # a missed run heals later the same day


def test_quiet_hours_send_nothing(db):
    user_with_device(db)
    assert due(db, "2027-01-15 22:30+00", ignore_slot=True) == []  # 23:30 in Stockholm


def test_already_sent_today_or_within_20_hours_is_not_due(db):
    # Users whose slot (08:00–10:00) has arrived by 11:00 local, so only the caps decide.
    early = [u for u, h in FIXTURE["slots"].items() if h <= 10][:3]
    a, b, c = (user_with_device(db, u) for u in early)
    db.execute("insert into public.notification_log (user_id, species_id, sent_at) values (%s, 'moose', '2027-01-15 07:00+00')", (a,))
    db.execute("insert into public.notification_log (user_id, species_id, sent_at) values (%s, 'moose', '2027-01-14 19:00+00')", (b,))
    db.execute("insert into public.notification_log (user_id, species_id, sent_at) values (%s, 'moose', '2027-01-13 19:00+00')", (c,))
    # 11:00 local. a: sent today (08:00 local). b: sent 15 hours ago, yesterday evening (within 20 h).
    # c: sent two days ago.
    rows = due(db, "2027-01-15 10:00+00")
    assert [r[0] for r in rows] == [c]


def test_aggregates_devices_collection_and_recent_sends(db):
    u = user_with_device(db)
    db.execute("insert into public.push_devices (user_id, token, platform, locale) values (%s, 'tok-2', 'ios', 'en')", (u,))
    db.execute("insert into public.collection (user_id, species_id, spotted_at) values (%s, 'moose', now())", (u,))
    # Yesterday, 33 hours before: still due today, and part of the 48-hour history the planner reads.
    db.execute("insert into public.notification_log (user_id, species_id, sent_at) values (%s, 'moose', '2027-01-14 10:00+00')", (u,))
    (row,) = due(db, "2027-01-15 19:00+00", ignore_slot=True)
    assert row[1] == "SWE.9_1"
    assert sorted(d["token"] for d in row[2]) == sorted([f"tok-{u}", "tok-2"])
    assert row[3] == ["moose"]
    assert len(row[4]) == 1


def test_one_user_for_the_smoke_test(db):
    a, b = user_with_device(db), user_with_device(db)
    # Already notified today: the smoke test still sends to that one user, ignoring slot and caps.
    db.execute("insert into public.notification_log (user_id, species_id, sent_at) values (%s, 'moose', '2027-01-15 08:00+00')", (b,))
    assert [r[0] for r in due(db, "2027-01-15 19:00+00", only_user=b, ignore_slot=True)] == [b]


def test_only_the_service_role_may_call_it(db):
    u = user_with_device(db)
    with as_user(db, u), pytest.raises(psycopg.errors.InsufficientPrivilege):
        due(db, "2027-01-15 19:00+00")


def test_ten_thousand_opted_in_returns_only_the_due(db):
    db.execute(
        "insert into auth.users (id) select gen_random_uuid() from generate_series(1, 10000)"
    )
    db.execute("insert into public.profiles (user_id, home_region) select id, 'SWE.9_1' from auth.users")
    db.execute(
        "insert into public.push_devices (user_id, token, platform, locale) "
        "select id, 'tok-' || id, 'android', 'sv' from auth.users"
    )
    # 09:30 local: only the users whose slot is 08:00 or 09:00 are due, about 2/13 of everyone.
    rows = due(db, "2027-01-15 08:30+00")
    expected = db.execute(
        "select count(*) from auth.users where public.push_slot_hour(id::text, %s) in (8, 9)", (HOURS,)
    ).fetchone()[0]
    assert len(rows) == expected
    assert 0 < len(rows) < 3000
