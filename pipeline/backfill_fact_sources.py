"""Record where every Wikipedia fact came from (T-276 · review B-59).

Facts are Wikipedia text (CC BY-SA 4.0) or machine translations of it, and were stored with no
source. The card now credits each fact with a link to its article, so `species_content` carries
`fact_source_url` and `fact_origin`. Writers fill them from now on; this fills the rows written
before, without refetching any text:

  - the article the species' name resolves to in that language's edition -> 'wikipedia';
  - no such article, English or Swedish -> the fact came through a synonym (T-260): a search link
    in that edition, 'wikipedia';
  - no such article in another language -> the fact was machine-translated from the English (else
    Swedish) one (T-235): that row's source, 'wikipedia-translated'.

The curated species' facts are the project's own text and carry no Wikipedia credit; only
catalogue species (`gbif:` ids) are filled. Resumable: a rerun only sees rows still without a source.

    SUPABASE_DB_URL=... python pipeline/backfill_fact_sources.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from media.templates_i18n import LOCALES  # noqa: E402
from media.wikimedia import article_url, search_url  # noqa: E402

FIRST = ["en", "sv"]

PENDING_SQL = (
    "select c.species_id, s.scientific_name from public.species_content c "
    "join public.species s on s.id = c.species_id "
    "where c.locale = %s and c.fact is not null and c.fact <> '' and c.fact_source_url is null "
    "and c.species_id like 'gbif:%%'"
)
SOURCE_SQL = "select species_id, locale, fact_source_url from public.species_content where locale in ('en', 'sv') and fact_source_url is not null"
SET_SQL = (
    "update public.species_content set fact_source_url = %s, fact_origin = %s "
    "where species_id = %s and locale = %s and fact_source_url is null"
)


def source_for(
    locale: str, name: str, titles: dict[str, str | None], translated_from: str | None
) -> tuple[str, str]:
    title = titles.get(name)
    if title:
        return article_url(locale, title), "wikipedia"
    if locale in FIRST or not translated_from:
        return search_url(locale, name), "wikipedia"
    return translated_from, "wikipedia-translated"


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")
    import psycopg

    from media.wikimedia import WikimediaClient

    client = WikimediaClient()
    locales = FIRST + sorted(l for l in LOCALES if l not in FIRST)
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        for locale in locales:
            cur.execute(PENDING_SQL, (locale,))
            pending = cur.fetchall()
            if not pending:
                continue
            cur.execute(SOURCE_SQL)
            by_lang: dict[str, dict[str, str]] = {"en": {}, "sv": {}}
            for sid, loc, url in cur.fetchall():
                by_lang[loc][sid] = url
            try:
                titles = client.fetch_titles([name for _, name in pending], locale)
            except Exception as exc:  # one edition failing skips that language, not the run
                print(f"  ! [{locale}] {exc}", flush=True)
                continue
            rows = []
            for sid, name in pending:
                fallback = by_lang["en"].get(sid) or by_lang["sv"].get(sid)
                url, origin = source_for(locale, name, titles, fallback)
                rows.append((url, origin, sid, locale))
            cur.executemany(SET_SQL, rows)
            conn.commit()
            print(f"[{locale}] {len(rows)} facts sourced", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
