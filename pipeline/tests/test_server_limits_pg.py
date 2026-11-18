"""Server limits a client cannot get around (T-286 · review B-48, B-50)."""

import pytest

from pg_harness import as_user, connect, fresh, needs_pg, new_user

pytestmark = needs_pg

MIGRATIONS = [
    "20260704000001_profiles_and_collection.sql",
    "20260707000001_production_species_tables.sql",
    "20261029000001_free_catch_enforcement.sql",
    "20261029000006_entitlements.sql",
    "20261029000008_households.sql",
    "20261116000001_free_catch_count_once.sql",
    "20261118000004_server_limits.sql",
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


def spot(conn, user, species_id):
    with as_user(conn, user):
        conn.execute(
            "insert into public.collection (user_id, species_id, spotted_at) values (%s, %s, now())",
            (user, species_id),
        )


# B-48: a collection row names a real species.
def test_a_known_species_is_accepted_and_an_unknown_one_refused(db):
    u = new_user(db)
    spot(db, u, "moose")
    with pytest.raises(Exception, match="foreign key|violates"):
        spot(db, u, "x" * 100_000)
    with pytest.raises(Exception, match="foreign key|violates"):
        spot(db, u, "not-a-species")


# B-50: removing a member changes the invite code, so they cannot simply rejoin.
def test_removing_a_member_rotates_the_code(db):
    owner, member = new_user(db), new_user(db)
    db.execute("select public.set_entitlement(%s, 'family', true, now(), 'family', 'e')", (owner,))
    with as_user(db, owner):
        code = db.execute("select public.create_household()").fetchone()[0]
    with as_user(db, member):
        db.execute("select public.join_household(%s)", (code,))
    with as_user(db, owner):
        db.execute("select public.remove_household_member(%s)", (member,))
    new_code = db.execute("select invite_code from public.households where owner_id = %s", (owner,)).fetchone()[0]
    assert new_code != code
    with as_user(db, member):
        with pytest.raises(Exception, match="household_not_found"):
            db.execute("select public.join_household(%s)", (code,))
    with as_user(db, member):
        db.execute("select public.join_household(%s)", (new_code,))


def test_the_owner_can_rotate_the_code_and_nobody_else_can(db):
    owner, other = new_user(db), new_user(db)
    db.execute("select public.set_entitlement(%s, 'family', true, now(), 'family', 'e')", (owner,))
    with as_user(db, owner):
        code = db.execute("select public.create_household()").fetchone()[0]
        rotated = db.execute("select public.rotate_household_code()").fetchone()[0]
    assert rotated != code
    with as_user(db, other):
        with pytest.raises(Exception, match="not_owner"):
            db.execute("select public.rotate_household_code()")
