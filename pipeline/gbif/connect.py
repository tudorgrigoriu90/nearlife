"""Explain the Postgres connect failures that are configuration, not outages (T-174).

`psycopg` reports a bad $SUPABASE_DB_URL as a network error against a raw IP, which reads like the
database is down. The two failures we have actually hit are both connection-string choices, and
both have a one-line fix — so recognise them and say so.
"""

from urllib.parse import urlparse

# Supabase's direct host (db.<ref>.supabase.co) resolves to IPv6 only. GitHub Actions runners have
# no IPv6 at all, so every direct connection from CI fails as "Network is unreachable".
_DIRECT_SUFFIX = ".supabase.co"
_POOLER_MARKER = "pooler.supabase.com"
_UNREACHABLE = "network is unreachable"

# Transaction mode (6543) breaks psycopg3's automatic prepared statements, which both loaders hit
# because they executemany over thousands of rows. Session mode (5432) does not.
_TRANSACTION_PORT = 6543


def connection_hint(dsn: str, message: str) -> str | None:
    """Return an actionable hint for a connect failure, or None if we don't recognise it."""
    if _UNREACHABLE not in message.lower():
        return None  # auth failures, bad database names etc. already say what they are
    try:
        host = (urlparse(dsn).hostname or "").lower()
        port = urlparse(dsn).port
    except ValueError:
        return None
    if not host:
        return None
    if _POOLER_MARKER in host:
        if port == _TRANSACTION_PORT:
            return (
                "Connected via the transaction pooler (port 6543). This loader runs executemany "
                "over thousands of rows, which psycopg3 promotes to prepared statements — "
                "unsupported in transaction mode. Use the session pooler on port 5432."
            )
        return None  # genuinely unreachable pooler: a real network problem, not a wrong choice
    if host.endswith(_DIRECT_SUFFIX):
        return (
            f"{host} is Supabase's direct connection host, which resolves to IPv6 only. "
            "GitHub Actions runners have no IPv6, so this can never connect from CI. "
            "Point $SUPABASE_DB_URL at the session pooler instead "
            "(Database → Connection string → Session pooler, port 5432); its username is "
            "postgres.<project-ref> rather than plain postgres."
        )
    return None
