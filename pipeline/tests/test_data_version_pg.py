"""The species data version changes with every change to the county data (T-275 · review B-20)."""

import pytest

from pg_harness import connect, fresh, needs_pg

pytestmark = needs_pg

MIGRATIONS = [
    "20260707000001_production_species_tables.sql",
    "20260707000003_regions_and_presence.sql",
    "20261029000002_species_media.sql",
    "20261118000002_data_version.sql",
]


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, MIGRATIONS)
    yield conn
    conn.close()


def version(conn) -> str:
    conn.execute("set role anon")
    try:
        return conn.execute("select public.data_version()").fetchone()[0]
    finally:
        conn.execute("reset role")


def test_anyone_can_read_the_version_and_a_write_changes_it(db):
    before = version(db)
    assert before
    db.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) "
        "values ('x', 'X x', 'X', 'bird', 'common')"
    )
    after = version(db)
    assert after != before
    db.execute("update public.species set common_name = 'Y' where id = 'x'")
    assert version(db) != after


def test_users_cannot_write_the_version(db):
    db.execute("set role anon")
    with pytest.raises(Exception, match="permission denied"):
        db.execute("update public.species_data_version set version = 'mine'")
    db.execute("reset role")
