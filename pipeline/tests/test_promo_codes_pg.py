"""Gift and promo codes (T-356 · review F-19), against real Postgres.

A code grants only the entitlements it names, within its use budget and before its expiry.
"""

import psycopg
import pytest

from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000006_entitlements.sql",
    "20261029000008_households.sql",
    "20261101000001_reviewer_access.sql",
    "20261119000013_promo_codes.sql",
]


@pytest.fixture
def db():
    conn = connect()
    # Supabase keeps pgcrypto in `extensions`; the stub does not drop that schema.
    conn.execute("create schema if not exists extensions; create extension if not exists pgcrypto schema extensions")
    fresh(conn, MIGRATIONS)
    yield conn
    conn.close()


def add_code(conn, code, grants, uses=5, expires="now() + interval '1 day'"):
    conn.execute(
        "insert into public.reviewer_codes (code_hash, label, uses_left, expires_at, grants) values "
        f"(encode(extensions.digest(%s, 'sha256'), 'hex'), 'test', %s, {expires}, %s)",
        (code, uses, grants),
    )


def redeem(conn, user, code):
    with as_user(conn, user):
        return conn.execute("select public.redeem_reviewer_code(%s)", (code,)).fetchone()[0]


def active(conn, user):
    rows = conn.execute(
        "select entitlement from public.entitlements where user_id = %s and active order by 1", (user,)
    ).fetchall()
    return [r[0] for r in rows]


def test_a_code_grants_only_its_stated_entitlement(db):
    add_code(db, "SCHOOLCODE", ["region_SWE_9_1"])
    u = new_user(db)
    assert redeem(db, u, "school-code") is True
    assert active(db, u) == ["region_SWE_9_1"]
    assert db.execute("select full_game from public.profiles where user_id = %s", (u,)).fetchone() in (None, (False,))


def test_existing_codes_keep_granting_the_full_game_and_every_county(db):
    db.execute(
        "insert into public.reviewer_codes (code_hash, label, uses_left, expires_at) values "
        "(encode(extensions.digest('OLDCODE', 'sha256'), 'hex'), 'old', 1, now() + interval '1 day')"
    )
    u = new_user(db)
    assert redeem(db, u, "OLDCODE") is True
    assert active(db, u) == ["all_regions", "full_game"]


def test_budget_and_expiry_are_enforced(db):
    add_code(db, "ONEUSE", ["full_game"], uses=1)
    add_code(db, "EXPIRED", ["full_game"], expires="now() - interval '1 day'")
    a, b = new_user(db), new_user(db)
    assert redeem(db, a, "ONEUSE") is True
    assert redeem(db, b, "ONEUSE") is False
    assert redeem(db, b, "EXPIRED") is False
    assert active(db, b) == []


def test_a_code_can_only_name_entitlements_the_app_sells(db):
    for bad in (["family"], ["anything"], [], ["full_game", "region_x"]):
        with pytest.raises(psycopg.errors.CheckViolation):
            add_code(db, f"BAD{len(bad)}{bad[:1]}", bad)
