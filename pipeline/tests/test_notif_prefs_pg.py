"""Notification choices against real Postgres (T-341 · review F-03): stored by their owner,
validated, and applied by push_due_users (window and frequency)."""

import json
from pathlib import Path

import psycopg
import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg

pytestmark = needs_pg

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "send_slots.json").read_text())
HOURS = FIXTURE["allowedHours"]


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, [
        "20260704000001_profiles_and_collection.sql",
        "20260707000001_production_species_tables.sql",
        "20261029000001_free_catch_enforcement.sql",
    ])
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    for name in ("20261119000004_push_due_users.sql", "20261119000009_notif_prefs.sql"):
        conn.execute((MIGRATIONS_DIR / name).read_text(encoding="utf-8"))
    yield conn
    conn.close()


def make_user(conn, prefs=None):
    user_id = str(conn.execute("insert into auth.users default values returning id").fetchone()[0])
    conn.execute(
        "insert into public.profiles (user_id, home_region, notif_prefs) values (%s, 'SWE.9_1', %s)",
        (user_id, json.dumps(prefs or {})),
    )
    conn.execute(
        "insert into public.push_devices (user_id, token, platform, locale) values (%s, %s, 'android', 'sv')",
        (user_id, f"tok-{user_id}"),
    )
    return user_id


def due(conn, at):
    return {
        r[0]: r[1]
        for r in conn.execute(
            "select user_id::text, prefs from public.push_due_users(%s, %s, 20) order by user_id", (at, HOURS)
        ).fetchall()
    }


def test_the_owner_writes_their_choices_and_nothing_else(db):
    u = make_user(db)
    with as_user(db, u):
        db.execute("update public.profiles set notif_prefs = %s where user_id = %s", (json.dumps({"frequency": "weekly"}), u))
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            db.execute("update public.profiles set full_game = true where user_id = %s", (u,))
    assert db.execute("select notif_prefs from public.profiles").fetchone()[0] == {"frequency": "weekly"}


@pytest.mark.parametrize(
    "bad",
    [{"frequency": "hourly"}, {"window": "night"}, {"groups": ["dragon"]}, {"groups": []}, {"extra": 1}, [1]],
)
def test_choices_the_sender_does_not_understand_are_refused(db, bad):
    with pytest.raises(psycopg.errors.CheckViolation):
        make_user(db, bad)


def test_a_window_keeps_sends_inside_it(db):
    u = make_user(db, {"window": "morning"})
    # Stockholm is UTC+1 in January: 10:30 local is the window's last hour, 12:30 is past it.
    assert u in due(db, "2027-01-15 09:30+00")
    assert u not in due(db, "2027-01-15 11:30+00")


def test_frequency_spaces_the_sends(db):
    weekly = make_user(db, {"frequency": "weekly"})
    daily = make_user(db)
    for u in (weekly, daily):
        db.execute(
            "insert into public.notification_log (user_id, species_id, sent_at) values (%s, 'x', '2027-01-12 19:00+00')", (u,)
        )
    later = due(db, "2027-01-15 19:30+00")  # three days on, the last waking hour
    assert daily in later and weekly not in later
    assert weekly in due(db, "2027-01-19 19:30+00")  # seven days on


def test_the_choices_reach_the_sender_and_no_choice_is_today(db):
    u = make_user(db, {"groups": ["plant"]})
    plain = make_user(db)
    got = due(db, "2027-01-15 19:30+00")
    assert got[u] == {"groups": ["plant"]}
    assert got[plain] == {}
