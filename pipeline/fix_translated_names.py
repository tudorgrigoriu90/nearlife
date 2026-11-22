"""Put the local common name into facts already machine-translated (T-391).

translate_facts.py now swaps the English common name the model left untranslated ("vendace") for
the language's own name as it writes; this applies the same rule, once, to the facts it wrote
before. Only `wikipedia-translated` facts are touched (a language's own Wikipedia text is never
edited), only where both names are known, and only rows the rule changes. Rerunning finds nothing.

    SUPABASE_DB_URL=... python pipeline/fix_translated_names.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from translate_facts import with_local_name  # noqa: E402

ROWS_SQL = """
select t.species_id, t.locale, t.fact, en.common_name, t.common_name
from public.species_content t
join public.species_content en on en.species_id = t.species_id and en.locale = 'en'
where t.fact_origin = 'wikipedia-translated' and t.fact is not null
  and en.common_name is not null and t.common_name is not null
"""

UPDATE_SQL = (
    "update public.species_content set fact = %s "
    "where species_id = %s and locale = %s and fact_origin = 'wikipedia-translated'"
)


def fixes(rows: list[tuple]) -> list[tuple[str, str, str]]:
    """(new fact, species_id, locale) for every row the rule changes."""
    out = []
    for species_id, locale, fact, en_name, local_name in rows:
        fixed = with_local_name(fact, en_name, local_name, locale)
        if fixed != fact:
            out.append((fixed, species_id, locale))
    return out


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(ROWS_SQL)
        rows = cur.fetchall()
        changes = fixes(rows)
        cur.executemany(UPDATE_SQL, changes)
        conn.commit()
    print(f"Translated facts checked: {len(rows)}; given the local name: {len(changes)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
