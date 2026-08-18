"""Load generated species content into Supabase `public.species_content` (T-145).

The "content JSON -> table" step called for by T-135/T-144 — the last pipeline piece before the
~12k species can render from the DB (T-057/T-059). Upserts locale-keyed fact / when-how / give /
protect rows from pipeline/data/content_*.json. Every species is loaded — those with no Wikipedia
article get a mission-only row with `fact = NULL` (T-146), so give/protect stay free for every
species (invariant #2); a fact is never fabricated (invariant #1). English (status=machine) content
only — Swedish arrives after the review-gated translation (T-127/T-135).

Run order: the species/presence loader (gbif.supabase_load) must run first — species_content.species_id
FK-references public.species. Runs in CI (or locally) with a **privileged** Postgres connection
string in $SUPABASE_DB_URL (the `postgres` role — never an API key of any kind). Idempotent (upsert):

    SUPABASE_DB_URL=postgres://...pooler.supabase.com:5432/postgres  python -m gbif.supabase_load_content

Use the SESSION pooler (5432), not the direct host and not transaction mode (6543): the
direct host is IPv6-only and unreachable from CI, and transaction mode rejects the
prepared statements psycopg3 creates for these executemany calls. See gbif/connect.py.
"""

import json
import os
from pathlib import Path

from gbif.content_rows import build_content_rows

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def load_content_files() -> list[dict]:
    """Read every content_*.json payload (build_content.py output)."""
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(DATA_DIR.glob("content_*.json"))
    ]


def _chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


CONTENT_SQL = (
    "insert into public.species_content "
    "(species_id, locale, common_name, fact, when_how, give, protect, always_free) "
    "values (%(species_id)s, %(locale)s, %(common_name)s, %(fact)s, %(when_how)s, "
    "%(give)s, %(protect)s, %(always_free)s) "
    "on conflict (species_id, locale) do update set "
    "common_name=excluded.common_name, fact=excluded.fact, when_how=excluded.when_how, "
    "give=excluded.give, protect=excluded.protect, always_free=excluded.always_free"
)


def main() -> None:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set (privileged Postgres connection string).")

    import psycopg  # imported lazily so the module imports without the DB driver (tests/CLI help)

    from gbif.connect import connection_hint

    rows, summary = build_content_rows(load_content_files())
    if not rows:
        # Nothing to load is a no-op, not a failure: it means build_content.py did not run this
        # cycle (content_scope=skip), and failing here would redden a pipeline whose real work
        # succeeded. Distinguished from a *failed* load, which raises below.
        print("no content_*.json found — nothing to load (did build_content.py run?)")
        return

    try:
        conn_ctx = psycopg.connect(dsn)
    except psycopg.OperationalError as err:
        hint = connection_hint(dsn, str(err))
        raise SystemExit(f"{err}\n\nLikely cause: {hint}" if hint else str(err)) from err

    with conn_ctx as conn, conn.cursor() as cur:
        for chunk in _chunks(rows, 1000):
            cur.executemany(CONTENT_SQL, chunk)
        conn.commit()

    print(
        f"loaded {len(rows)} content rows of {summary['total']} species "
        f"({summary['with_fact']} with a fact, {summary['without_fact']} mission-only, "
        f"{summary['skipped_dup']} dup)"
    )


if __name__ == "__main__":
    main()
