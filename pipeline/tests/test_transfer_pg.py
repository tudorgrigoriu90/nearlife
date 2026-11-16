"""A RevenueCat TRANSFER moves what the old account owns to the new one (T-267 · review B-02).

RevenueCat sends a TRANSFER when a purchase is restored into another account (a reinstall gives a
new anonymous Supabase user). The event names only the two sets of ids, so the database moves
every active store entitlement of the old accounts, and a Family owner's household goes with it.
"""

import pytest

from pg_harness import connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000006_entitlements.sql",
    "20261029000008_households.sql",
    "20261116000002_transfer_entitlements.sql",
]
BOUGHT = "2026-11-01T10:00:00Z"
MOVED = "2026-11-10T10:00:00Z"


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, MIGRATIONS)
    yield conn
    conn.close()


def grant(conn, user, entitlement, product=None, at=BOUGHT):
    conn.execute(
        "select public.set_entitlement(%s, %s, true, %s, %s, 'evt-buy')",
        (user, entitlement, at, product or entitlement),
    )


def active(conn, user) -> set[str]:
    rows = conn.execute(
        "select entitlement from public.entitlements where user_id = %s and active", (user,)
    ).fetchall()
    return {r[0] for r in rows}


def full_game(conn, user) -> bool:
    row = conn.execute("select full_game from public.profiles where user_id = %s", (user,)).fetchone()
    return bool(row and row[0])


def transfer(conn, src, dst, at=MOVED) -> str:
    return conn.execute(
        "select public.transfer_entitlements(%s::uuid[], %s::uuid[], %s, 'evt-t')", ([src], [dst], at)
    ).fetchone()[0]


def test_a_transfer_moves_every_active_entitlement_and_the_full_game(db):
    a, b = new_user(db), new_user(db)
    grant(db, a, "full_game")
    grant(db, a, "region_SWE_9_1", "region_swe_9")
    transfer(db, a, b)
    assert active(db, a) == set()
    assert active(db, b) == {"full_game", "region_SWE_9_1"}
    assert not full_game(db, a)
    assert full_game(db, b)


def test_a_family_household_moves_with_its_owner(db):
    a, b, member = new_user(db), new_user(db), new_user(db)
    grant(db, a, "family")
    hid = db.execute(
        "insert into public.households (owner_id, invite_code) values (%s, 'ABCDEFGH') returning id", (a,)
    ).fetchone()[0]
    db.execute("insert into public.household_members (household_id, user_id) values (%s, %s)", (hid, member))
    db.execute("select public.refresh_full_game(%s)", (member,))
    assert full_game(db, member)
    transfer(db, a, b)
    owner = db.execute("select owner_id from public.households where id = %s", (hid,)).fetchone()[0]
    assert str(owner) == b
    assert full_game(db, member)
    assert full_game(db, b) and not full_game(db, a)


def test_a_transfer_to_an_unknown_account_revokes_nothing(db):
    a = new_user(db)
    grant(db, a, "full_game")
    assert transfer(db, a, "00000000-0000-4000-8000-000000000000") == "unknown_user"
    assert active(db, a) == {"full_game"}


def test_a_reviewer_code_grant_is_not_a_store_purchase_and_stays(db):
    a, b = new_user(db), new_user(db)
    grant(db, a, "all_regions", "reviewer_code")
    transfer(db, a, b)
    assert active(db, a) == {"all_regions"}
    assert active(db, b) == set()


def test_replaying_the_transfer_changes_nothing(db):
    a, b = new_user(db), new_user(db)
    grant(db, a, "full_game")
    transfer(db, a, b)
    transfer(db, a, b)
    assert active(db, b) == {"full_game"}
    assert active(db, a) == set()


def test_users_cannot_call_it(db):
    a = new_user(db)
    db.execute("set role authenticated")
    with pytest.raises(Exception, match="permission denied"):
        db.execute("select public.transfer_entitlements(%s::uuid[], %s::uuid[], now(), 'x')", ([a], [a]))
    db.execute("reset role")
