"""Put the local common name into facts already machine-translated (T-391, T-394).

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
from translate_facts import with_local_name, without_swedish_name  # noqa: E402

ROWS_SQL = """
select t.species_id, t.locale, t.fact, en.common_name, t.common_name, sv.common_name, s.scientific_name,
       t.fact_source_url
from public.species_content t
join public.species s on s.id = t.species_id
left join public.species_content en on en.species_id = t.species_id and en.locale = 'en'
left join public.species_content sv on sv.species_id = t.species_id and sv.locale = 'sv'
where t.fact_origin = 'wikipedia-translated' and t.fact is not null
  and ((en.common_name is not null and t.common_name is not null)
       or (length(sv.common_name) >= 4 and (t.fact_source_url like '%%sv.wikipedia.org%%' or sv.common_name ~ '[åäöÅÄÖ]')))
"""

UPDATE_SQL = (
    "update public.species_content set fact = %s "
    "where species_id = %s and locale = %s and fact_origin = 'wikipedia-translated'"
)


def fixes(rows: list[tuple]) -> list[tuple[str, str, str]]:
    """(new fact, species_id, locale) for every row the rule changes."""
    out = []
    for species_id, locale, fact, en_name, local_name, sv_name, scientific, source in rows:
        fixed = with_local_name(fact, en_name, local_name, locale)
        # The Swedish name where the text came from Swedish (T-394), or where å/ä/ö mark it as
        # Swedish: a fact translated from Swedish can carry another source's link.
        from_swedish = bool(source and "sv.wikipedia.org" in source)
        if from_swedish or (sv_name and any(ch in sv_name.lower() for ch in "åäö")):
            fixed = without_swedish_name(fixed, sv_name, local_name, scientific, locale)
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
