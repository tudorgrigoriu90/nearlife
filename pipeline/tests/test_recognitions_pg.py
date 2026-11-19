"""Species recognised in the "I saw…" quiz, kept with the account (T-299 · review B-31)."""

import json

import psycopg
import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

BASE = [
    "20260704000001_profiles_and_collection.sql",
    "20260707000001_production_species_tables.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000006_entitlements.sql",
    "20261101000001_reviewer_access.sql",
    "20261118000003_my_data_export.sql",
    "20261119000001_content_reports.sql",
]
RECOGNITIONS = "20261119000002_recognitions.sql"


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, BASE[:4])
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    for name in BASE[4:] + [RECOGNITIONS]:
        conn.execute((MIGRATIONS_DIR / name).read_text(encoding="utf-8"))
    for sid in ("gbif:1", "gbif:2"):
        conn.execute(
            "insert into public.species (id, scientific_name, common_name, category, rarity) "
            "values (%s, %s, 'x', 'bird', 'common')",
            (sid, sid),
        )
    yield conn
    conn.close()


def recognise(conn, user, species):
    with as_user(conn, user):
        conn.execute(
            "insert into public.recognitions (species_id) values (%s) on conflict (user_id, species_id) do nothing",
            (species,),
        )


def mine(conn, user):
    with as_user(conn, user):
        return sorted(r[0] for r in conn.execute("select species_id from public.recognitions").fetchall())


def test_a_user_keeps_their_recognitions_and_sees_only_theirs(db):
    u, other = new_user(db), new_user(db)
    recognise(db, u, "gbif:1")
    recognise(db, u, "gbif:1")  # again: no duplicate, no error
    recognise(db, other, "gbif:2")
    assert mine(db, u) == ["gbif:1"]
    assert mine(db, other) == ["gbif:2"]


def test_a_recognition_cannot_be_written_for_someone_else(db):
    u, other = new_user(db), new_user(db)
    with as_user(db, u), pytest.raises(psycopg.Error):
        db.execute("insert into public.recognitions (user_id, species_id) values (%s, 'gbif:1')", (other,))


def test_only_real_species(db):
    u = new_user(db)
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        recognise(db, u, "gbif:999")


def test_in_the_export_and_gone_with_the_account(db):
    u = new_user(db)
    recognise(db, u, "gbif:2")
    with as_user(db, u):
        out = db.execute("select public.my_data_export()").fetchone()[0]
    data = out if isinstance(out, dict) else json.loads(out)
    assert [r["speciesId"] for r in data["recognitions"]] == ["gbif:2"]
    assert "contentReports" in data
    db.execute("delete from auth.users where id = %s", (u,))
    assert db.execute("select count(*) from public.recognitions").fetchone()[0] == 0
