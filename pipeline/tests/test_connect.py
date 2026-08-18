"""Turning opaque Postgres connect failures into the actual fix (T-174).

The first Nordic load died with:

    connection to server at "2a05:d014:415:500:...", port 5432 failed: Network is unreachable

which reads like an outage and is nothing of the sort. Supabase's *direct* connection host is
IPv6-only and GitHub Actions runners have no IPv6, so the fix is to point $SUPABASE_DB_URL at the
pooler. That cost a round trip to work out from a raw traceback; it should not cost the next one.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.connect import connection_hint  # noqa: E402

DIRECT = "postgresql://postgres:pw@db.subjdoiicfmiimtvlzsg.supabase.co:5432/postgres"
POOLER = "postgresql://postgres.subjdoiicfmiimtvlzsg:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
UNREACHABLE = 'connection to server at "2a05:d014:415:500::1", port 5432 failed: Network is unreachable'


def test_unreachable_direct_host_explains_the_ipv6_trap():
    hint = connection_hint(DIRECT, UNREACHABLE)
    assert hint is not None
    assert "pooler" in hint.lower()


def test_the_hint_names_ipv6_so_the_cause_is_obvious_not_just_the_cure():
    assert "IPv6" in connection_hint(DIRECT, UNREACHABLE)


def test_no_hint_when_already_on_the_pooler():
    # Unreachable via the pooler is a real network problem; suggesting the pooler would misdirect.
    assert connection_hint(POOLER, UNREACHABLE) is None


def test_a_wrong_password_is_not_reported_as_a_network_problem():
    assert connection_hint(DIRECT, 'password authentication failed for user "postgres"') is None


def test_transaction_pooler_port_is_flagged_for_this_workload():
    # psycopg3 promotes repeated statements to prepared ones; PgBouncer transaction mode rejects
    # them, and both loaders run executemany over thousands of rows.
    hint = connection_hint(POOLER.replace(":5432/", ":6543/"), UNREACHABLE)
    assert hint is not None and "5432" in hint


def test_hint_survives_a_dsn_it_cannot_parse():
    assert connection_hint("not a dsn", UNREACHABLE) is None
