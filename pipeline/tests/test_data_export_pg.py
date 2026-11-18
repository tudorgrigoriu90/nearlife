"""The data export holds every table the server keeps about the user (T-280 · review B-18)."""

import json

import pytest

from pg_harness import MIGRATIONS as MIGRATIONS_DIR
from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000006_entitlements.sql",
    "20261101000001_reviewer_access.sql",
    "20261118000003_my_data_export.sql",
]


@pytest.fixture
def db():
    conn = connect()
    conn.execute("create extension if not exists pgcrypto")
    fresh(conn, MIGRATIONS[:3])
    # The push tables only: the rest of that migration needs pg_net, Vault and pg_cron.
    push = (MIGRATIONS_DIR / "20261028000001_push_notifications.sql").read_text(encoding="utf-8")
    conn.execute(push.split("-- ── cron → Edge Function authentication")[0])
    for name in MIGRATIONS[3:]:
        conn.execute((MIGRATIONS_DIR / name).read_text(encoding="utf-8"))
    yield conn
    conn.close()


def test_one_row_in_each_table_appears_in_the_export(db):
    u, other = new_user(db), new_user(db)
    db.execute("insert into public.profiles (user_id, home_region, free_catches_used, free_catch_season) values (%s, 'SWE.9_1', 2, '2026-autumn')", (u,))
    db.execute("insert into public.push_devices (user_id, token, platform, locale) values (%s, 'tok-abcdefghij123456', 'android', 'sv')", (u,))
    db.execute("insert into public.notification_log (user_id, species_id) values (%s, 'gbif:1')", (u,))
    db.execute("insert into public.notification_log (user_id, species_id) values (%s, 'gbif:2')", (other,))
    db.execute("insert into public.reviewer_codes (code_hash, label, uses_left, expires_at) values ('h', 'test', 5, now() + interval '1 day')")
    db.execute("insert into public.reviewer_redemptions (user_id, code_hash) values (%s, 'h')", (u,))
    with as_user(db, u):
        out = db.execute("select public.my_data_export()").fetchone()[0]
    data = out if isinstance(out, dict) else json.loads(out)
    assert data["account"]["homeRegion"] == "SWE.9_1"
    assert data["account"]["freeCatchesUsed"] == 2
    assert data["account"]["freeCatchSeason"] == "2026-autumn"
    assert data["account"]["fullGame"] is False
    assert data["account"]["createdAt"]
    assert [n["speciesId"] for n in data["notifications"]] == ["gbif:1"]  # only the user's own
    (device,) = data["devices"]
    assert device == {**device, "platform": "android", "locale": "sv", "tokenEnd": "123456"}
    assert "token" not in device
    assert len(data["reviewerCodes"]) == 1 and "codeHash" not in data["reviewerCodes"][0]


def test_without_a_session_there_is_nothing(db):
    db.execute("set role anon")
    with pytest.raises(Exception):
        db.execute("select public.my_data_export()")
    db.execute("reset role")
