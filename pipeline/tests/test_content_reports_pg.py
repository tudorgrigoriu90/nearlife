"""Reports of a wrong name, photo, text or season (T-293 · review I-32).

10,000 species ship in 38 languages with no per-species review (T-177); this is the channel for
users to say what is wrong. A signed-in user may send reports; nobody but the service role reads
them, an account sends at most 20 a day, and they leave with the account.
"""

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
]
REPORTS = "20261119000001_content_reports.sql"


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, BASE[:4])
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    for name in BASE[4:] + [REPORTS]:
        conn.execute((MIGRATIONS_DIR / name).read_text(encoding="utf-8"))
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) "
        "values ('gbif:1', 'Alces alces', 'Moose', 'mammal', 'common')"
    )
    yield conn
    conn.close()


def report(conn, user, kind="name", comment=None, species="gbif:1", locale="sv"):
    with as_user(conn, user):
        conn.execute(
            "insert into public.content_reports (species_id, locale, kind, comment) values (%s, %s, %s, %s)",
            (species, locale, kind, comment),
        )


def test_a_signed_in_user_can_send_a_report_for_themselves(db):
    u = new_user(db)
    report(db, u, "photo", "That is a hare, not a moose.")
    row = db.execute("select user_id::text, species_id, locale, kind, comment from public.content_reports").fetchone()
    assert row == (u, "gbif:1", "sv", "photo", "That is a hare, not a moose.")


def test_users_cannot_read_reports_not_even_their_own(db):
    u = new_user(db)
    report(db, u)
    with as_user(db, u), pytest.raises(psycopg.errors.InsufficientPrivilege):
        db.execute("select * from public.content_reports").fetchall()


def test_a_report_cannot_be_sent_in_someone_elses_name(db):
    u, other = new_user(db), new_user(db)
    with as_user(db, u), pytest.raises(psycopg.errors.InsufficientPrivilege):
        db.execute(
            "insert into public.content_reports (user_id, species_id, locale, kind) values (%s, 'gbif:1', 'sv', 'name')",
            (other,),
        )


@pytest.mark.parametrize(
    "kind,comment,species,locale",
    [
        ("colour", None, "gbif:1", "sv"),  # unknown kind
        ("name", "x" * 501, "gbif:1", "sv"),  # comment too long
        ("name", None, "gbif:999", "sv"),  # no such species
        ("name", None, "gbif:1", "svenska"),  # not a language code
    ],
)
def test_malformed_reports_are_refused(db, kind, comment, species, locale):
    u = new_user(db)
    with pytest.raises(psycopg.Error):
        report(db, u, kind, comment, species, locale)


def test_an_account_sends_at_most_20_reports_a_day(db):
    u, other = new_user(db), new_user(db)
    for _ in range(20):
        report(db, u)
    with pytest.raises(psycopg.errors.RaiseException, match="too_many_reports"):
        report(db, u)
    report(db, other)  # the cap is per account


def test_the_users_own_reports_are_in_their_export(db):
    u, other = new_user(db), new_user(db)
    report(db, u, "season", "Not here in January.")
    report(db, other, "name")
    with as_user(db, u):
        out = db.execute("select public.my_data_export()").fetchone()[0]
    data = out if isinstance(out, dict) else json.loads(out)
    assert [(r["speciesId"], r["kind"], r["comment"]) for r in data["contentReports"]] == [
        ("gbif:1", "season", "Not here in January.")
    ]
    assert data["contentReports"][0]["sentAt"]
    # The earlier sections are still there.
    assert {"account", "notifications", "devices", "reviewerCodes"} <= set(data)


def test_reports_leave_with_the_account(db):
    u = new_user(db)
    report(db, u)
    db.execute("delete from auth.users where id = %s", (u,))
    assert db.execute("select count(*) from public.content_reports").fetchone()[0] == 0
