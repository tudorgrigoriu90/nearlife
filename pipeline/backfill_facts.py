"""Fill the facts the 50-title batch lost, straight into empty fact slots (T-259).

Wikipedia returns at most 20 intro extracts per request; the content build asked for 50 and never
followed the continuation (fixed in media/wikimedia.py), so about half of all species lost their
fact in every language. Rebuilding all content is hours of work; this asks Wikipedia again only for
the empty slots, language by language (Swedish and English first: most users read those, and the
machine-translated languages are translated from them, T-232), most-recorded species first.

Only empty slots are written, so a fact already there, written or translated, is never replaced.
Resumable by nature: a rerun finds only what is still empty. Stops at a time budget.

    SUPABASE_DB_URL=... python pipeline/backfill_facts.py [--max-minutes 330]
"""

import argparse
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from media.templates_i18n import LOCALES  # noqa: E402

FIRST = ["sv", "en"]
CHUNK = 200  # species per round trip to the database; Wikipedia is asked 20 at a time inside

PENDING_SQL = (
    "select s.id, s.scientific_name from public.species_content c "
    "join public.species s on s.id = c.species_id and s.in_catalogue "
    "where c.locale = %s and (c.fact is null or c.fact = '') "
    "order by (select coalesce(sum(p.occurrences), 0) from public.species_presence p "
    "where p.species_id = s.id) desc, s.id"
)
FILL_SQL = (
    "update public.species_content set fact = %(fact)s "
    "where species_id = %(species_id)s and locale = %(locale)s and (fact is null or fact = '')"
)


def locale_order(locales: list[str]) -> list[str]:
    return [l for l in FIRST if l in locales] + sorted(l for l in locales if l not in FIRST)


def fill_rows(locale: str, ids_by_name: dict[str, str], facts: dict[str, str | None]) -> list[dict]:
    return [
        {"species_id": ids_by_name[name], "locale": locale, "fact": fact}
        for name, fact in facts.items()
        if fact and name in ids_by_name
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-minutes", type=float, default=330.0)
    args = parser.parse_args()
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")

    import psycopg

    from media.wikimedia import WikimediaClient

    deadline = time.monotonic() + args.max_minutes * 60
    client = WikimediaClient()
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        for locale in locale_order(list(LOCALES)):
            cur.execute(PENDING_SQL, (locale,))
            pending = cur.fetchall()
            filled = 0
            for i in range(0, len(pending), CHUNK):
                if time.monotonic() > deadline:
                    print(f"time budget reached in {locale} — the next run resumes here", flush=True)
                    conn.commit()
                    return 0
                chunk = pending[i : i + CHUNK]
                ids_by_name = {name: sid for sid, name in chunk}
                try:
                    facts = client.fetch_extracts(list(ids_by_name), locale)
                except Exception as exc:  # stays empty; the next run asks again
                    print(f"  ! [{locale}] {exc}", flush=True)
                    continue
                rows = fill_rows(locale, ids_by_name, facts)
                cur.executemany(FILL_SQL, rows)
                conn.commit()
                filled += len(rows)
            print(f"[{locale}] {filled} facts filled of {len(pending)} empty", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
