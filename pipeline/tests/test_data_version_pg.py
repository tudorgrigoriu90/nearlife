"""The species data version changes with every change to the county data (T-275 · review B-20),
and taking it never makes one writer wait for another (T-317)."""

import pytest

from pg_harness import URL, connect, fresh, needs_pg

pytestmark = needs_pg

MIGRATIONS = [
    "20260707000001_production_species_tables.sql",
    "20260707000003_regions_and_presence.sql",
    "20261029000002_species_media.sql",
    "20261118000002_data_version.sql",
    "20261119000005_data_version_bumps.sql",
]


@pytest.fixture
def db():
    conn = connect()
    fresh(conn, MIGRATIONS)
    conn.execute(
        "insert into public.species (id, scientific_name, common_name, category, rarity) "
        "values ('x', 'X x', 'X', 'bird', 'common')"
    )
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
    db.execute("update public.species set common_name = 'Y' where id = 'x'")
    after = version(db)
    assert after != before
    db.execute("insert into public.species_media (species_id, url, license) values ('x', 'u', 'CC0')")
    assert version(db) != after


def test_users_cannot_write_the_version(db):
    db.execute("set role anon")
    try:
        with pytest.raises(Exception, match="permission denied"):
            db.execute("insert into public.species_data_bumps default values")
    finally:
        db.execute("reset role")


def test_a_long_writer_does_not_block_another(db):
    """The photo run timed out behind the facts backfill: both bumped one shared row."""
    import psycopg

    long = psycopg.connect(URL)  # a transaction, left open
    long.execute("update public.species set common_name = 'Long' where id = 'x'")
    try:
        db.execute("set statement_timeout = '3s'")
        db.execute("insert into public.species_media (species_id, url, license) values ('x', 'u', 'CC0')")
    finally:
        db.execute("reset statement_timeout")
        long.rollback()
        long.close()


def test_a_writer_that_commits_last_still_changes_the_version(db):
    """An app reading the version between two commits must see a new one after the second."""
    import psycopg

    early = psycopg.connect(URL)
    early.execute("update public.species set common_name = 'Early' where id = 'x'")  # not committed
    db.execute("set statement_timeout = '3s'")  # a regression fails here instead of hanging
    db.execute("insert into public.species_media (species_id, url, license) values ('x', 'u', 'CC0')")
    db.execute("reset statement_timeout")
    between = version(db)
    early.commit()
    early.close()
    assert version(db) != between


def test_a_rolled_back_write_leaves_the_version(db):
    import psycopg

    before = version(db)
    tx = psycopg.connect(URL)
    tx.execute("update public.species set common_name = 'Nope' where id = 'x'")
    tx.rollback()
    tx.close()
    assert version(db) == before


def test_pruning_keeps_the_version_moving_forward(db):
    for name in ("a", "b", "c"):
        db.execute("update public.species set common_name = %s where id = 'x'", (name,))
    db.execute("select public.prune_species_data_bumps()")
    assert db.execute("select count(*) from public.species_data_bumps").fetchone()[0] == 1
    before = version(db)
    db.execute("update public.species set common_name = 'd' where id = 'x'")
    assert version(db) != before
