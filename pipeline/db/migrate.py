"""Apply repo migrations to Supabase from CI (T-176).

`supabase db push` needs the CLI and a linked project on someone's laptop; the migration that
actually matters here is 1.5 MB of content seed, far too large to move through a chat session. This
runs the same job from Actions with $SUPABASE_DB_URL.

Modes:
  plan    list what would be applied and stop (the default — never writes)
  apply   run each pending migration, each in its own transaction, then record it
  repair  record versions as applied WITHOUT running them, for DDL already applied by other means

`repair` exists because the live project's history was written by the MCP tool, which stamped its
own timestamps: six files' contents are applied under versions that do not match their filenames.
Without repair, `apply` would re-run them.

    SUPABASE_DB_URL=postgres://...pooler.supabase.com:5432/postgres python -m db.migrate plan
"""

import os
import re
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "supabase" / "migrations"
HISTORY_TABLE = "supabase_migrations.schema_migrations"

_NAME = re.compile(r"^(\d{14})_(.+)\.sql$")


def parse_migration_name(filename: str) -> tuple[str, str] | None:
    """`20260810000001_seed.sql` → ('20260810000001', 'seed'); None if it is not a migration."""
    m = _NAME.match(filename)
    return (m.group(1), m.group(2)) if m else None


def local_migrations(directory: Path = MIGRATIONS_DIR) -> list[tuple[str, str]]:
    found = [parse_migration_name(p.name) for p in sorted(directory.glob("*.sql"))]
    return [f for f in found if f is not None]


def pending_versions(
    local: list[tuple[str, str]], applied: set[str]
) -> list[tuple[str, str]]:
    """Local migrations the database has no record of, oldest first.

    A recorded version with no local file is deliberately ignored rather than reported: it is
    history from another tool, not work to do.
    """
    return sorted((v, n) for v, n in local if v not in applied)


def _applied(cur) -> set[str]:
    cur.execute(f"select version from {HISTORY_TABLE}")
    return {row[0] for row in cur.fetchall()}


def _record(cur, version: str, name: str) -> None:
    cur.execute(
        f"insert into {HISTORY_TABLE} (version, name) values (%s, %s) "
        "on conflict (version) do nothing",
        (version, name),
    )


def main(argv: list[str]) -> int:
    mode = argv[0] if argv else "plan"
    if mode not in {"plan", "apply", "repair"}:
        print(__doc__)
        return 2

    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set (privileged Postgres connection string).")

    import psycopg

    from gbif.connect import connection_hint

    try:
        conn = psycopg.connect(dsn)
    except psycopg.OperationalError as err:
        hint = connection_hint(dsn, str(err))
        raise SystemExit(f"{err}\n\nLikely cause: {hint}" if hint else str(err)) from err

    with conn:
        with conn.cursor() as cur:
            applied = _applied(cur)
        local = local_migrations()
        todo = pending_versions(local, applied)

        print(f"{len(local)} local migrations, {len(applied)} recorded, {len(todo)} pending")
        for version, name in todo:
            print(f"  pending {version}_{name}")
        if not todo:
            return 0

        if mode == "plan":
            print("\nplan only — nothing was written. Re-run with 'apply' or 'repair'.")
            return 0

        if mode == "repair":
            # Stamp without executing: the DDL is already in place by other means.
            with conn.cursor() as cur:
                for version, name in todo:
                    _record(cur, version, name)
            conn.commit()
            print(f"recorded {len(todo)} migrations as applied (nothing was executed)")
            return 0

        for version, name in todo:
            sql = (MIGRATIONS_DIR / f"{version}_{name}.sql").read_text(encoding="utf-8")
            print(f"applying {version}_{name} ({len(sql):,} bytes)…", flush=True)
            # One transaction per migration: a failure leaves that migration entirely unapplied
            # and unrecorded, rather than half-done with a stamp claiming otherwise.
            with conn.cursor() as cur:
                cur.execute(sql)
                _record(cur, version, name)
            conn.commit()
            print(f"  applied {version}_{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
