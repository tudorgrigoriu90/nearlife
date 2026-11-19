"""The weekly recap in the send log (T-350 · review F-04), against real Postgres."""

import psycopg
import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import connect, fresh, needs_pg, new_user

pytestmark = needs_pg


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, ["20260704000001_profiles_and_collection.sql"])
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    conn.execute((MIGRATIONS_DIR / "20261119000012_notification_kind.sql").read_text(encoding="utf-8"))
    yield conn
    conn.close()


def test_a_recap_is_logged_without_a_species_and_a_species_send_still_needs_one(db):
    u = new_user(db)
    db.execute("insert into public.notification_log (user_id, species_id) values (%s, 'owl')", (u,))
    db.execute("insert into public.notification_log (user_id, kind) values (%s, 'recap')", (u,))
    kinds = db.execute("select kind, species_id from public.notification_log order by id").fetchall()
    assert kinds == [("species", "owl"), ("recap", None)]
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute("insert into public.notification_log (user_id) values (%s)", (u,))
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute("insert into public.notification_log (user_id, kind) values (%s, 'digest')", (u,))
