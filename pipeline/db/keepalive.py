"""Keep the Supabase project awake, and report whether it is still populated (T-203).

Supabase pauses a free project after **7 consecutive days** without activity, and a paused project
takes the app down with it. Any query prevents that — but a job that only proves it ran is a wasted
slot. The same query reports the row counts, so this doubles as the only continuous monitoring the
project has.

The counts are **checked**, not merely printed: a project that is awake and empty is a worse state
than a paused one, because nothing looks wrong from the outside. An empty table fails the run, which
is what turns this into a notification.
"""

import os
import sys
from dataclasses import dataclass

WATCHED = ("species", "species_presence", "species_content")


@dataclass(frozen=True)
class Verdict:
    ok: bool
    line: str
    reason: str = ""


def summarise(counts: dict[str, int]) -> Verdict:
    """Judge a set of table counts. Every watched table must be present and non-empty.

    Deliberately not a comparison against last week: growth and ordinary churn are T-192's business,
    not this job's. The only question here is whether the project is awake and still has data.
    """
    line = ", ".join(f"{t}={counts.get(t, 'missing')}" for t in WATCHED)
    for table in WATCHED:
        value = counts.get(table)
        if value is None:
            return Verdict(False, line, f"{table} was not returned by the query")
        if value == 0:
            return Verdict(False, line, f"{table} is empty ({value} rows)")
    return Verdict(True, line)


def main() -> int:
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

    counts: dict[str, int] = {}
    with conn, conn.cursor() as cur:
        for table in WATCHED:
            cur.execute(f"select count(*) from public.{table}")
            counts[table] = cur.fetchone()[0]

    verdict = summarise(counts)
    print(f"supabase awake: {verdict.line}")
    if not verdict.ok:
        raise SystemExit(f"project is awake but not healthy: {verdict.reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
