"""Load generated species content into Supabase `public.species_content` (T-145).

The "content JSON -> table" step called for by T-135/T-144 — the last pipeline piece before the
~12k species can render from the DB (T-057/T-059). Upserts locale-keyed fact / when-how / give /
protect rows from pipeline/data/content_*.json. Only species with a grounded Wikipedia fact are
loaded (the table + app require one); fact-less species are reported, never fabricated (invariant
#1). English (status=machine) content only — Swedish arrives after the review-gated translation
(T-127/T-135).

Run order: the species/presence loader (gbif.supabase_load) must run first — species_content.species_id
FK-references public.species. Runs in CI (or locally) with a **service-role** Postgres connection
string in $SUPABASE_DB_URL (never the anon/publishable key). Idempotent (upsert):

    SUPABASE_DB_URL=postgres://...pooler.supabase.com:6543/postgres  python -m gbif.supabase_load_content
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
        raise SystemExit("SUPABASE_DB_URL not set (service-role Postgres connection string).")

    import psycopg  # imported lazily so the module imports without the DB driver (tests/CLI help)

    rows, summary = build_content_rows(load_content_files())

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        for chunk in _chunks(rows, 1000):
            cur.executemany(CONTENT_SQL, chunk)
        conn.commit()

    print(
        f"loaded {summary['with_fact']} content rows of {summary['total']} species "
        f"({summary['skipped_no_fact']} skipped: no grounded fact, {summary['skipped_dup']} dup)"
    )


if __name__ == "__main__":
    main()
