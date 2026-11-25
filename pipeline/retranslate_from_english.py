"""Translate again from English what was translated from Swedish (T-396).

When the facts were first machine-translated (T-235, 2026-11-01) many species had no English fact
yet, so the Swedish one was translated: Swedish → English → target, two steps of an offline model.
That breaks Swedish words badly ("dammussla" became "the women's mouse", "art" (species) became
"art"). The English facts arrived later (T-259), and the source-link backfill (T-276) then credited
those translations to the English article, which says something else.

This finds them by the words a translation leaves unchanged: Latin family-level names (Unionidae,
Rosaceae) and numbers. A translation holding what only the Swedish fact has, or none of what only
the English fact has, came from Swedish. Those rows are cleared (fact, link, origin), and
translate_facts.py, run next in the same job, fills them from English in one step. A row cleared
by mistake is only translated again from English, never lost.

    SUPABASE_DB_URL=... python pipeline/retranslate_from_english.py <locale> [--apply]
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from translate_facts import TARGET_LOCALES  # noqa: E402

_KEPT = re.compile(r"\b(?:[A-Z][a-z]+(?:idae|inae|aceae|ales|formes|ptera|oidea|ini)|\d{2,})\b")


def _kept(text: str | None) -> set[str]:
    return set(_KEPT.findall(text or ""))


def came_from_swedish(translated: str | None, en_fact: str | None, sv_fact: str | None) -> bool:
    if not translated or not en_fact:
        return False
    t, en, sv = _kept(translated), _kept(en_fact), _kept(sv_fact)
    only_sv, only_en = sv - en, en - sv
    if t & only_sv:
        return True
    return bool(only_en) and not (t & only_en)


ROWS_SQL = """
select t.species_id, t.fact, en.fact, sv.fact
from public.species_content t
join public.species_content en on en.species_id = t.species_id and en.locale = 'en' and en.fact is not null
left join public.species_content sv on sv.species_id = t.species_id and sv.locale = 'sv'
where t.locale = %s and t.fact_origin = 'wikipedia-translated' and t.fact is not null
"""

CLEAR_SQL = (
    "update public.species_content set fact = null, fact_source_url = null, fact_origin = null "
    "where species_id = %s and locale = %s and fact_origin = 'wikipedia-translated'"
)


def main(argv: list[str]) -> int:
    if not argv or argv[0] not in TARGET_LOCALES:
        print(f"usage: retranslate_from_english.py <locale> [--apply], one of {' '.join(TARGET_LOCALES)}")
        return 2
    locale, apply = argv[0], "--apply" in argv
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(ROWS_SQL, (locale,))
        rows = cur.fetchall()
        found = [sid for sid, tr, en, sv in rows if came_from_swedish(tr, en, sv)]
        if apply:
            cur.executemany(CLEAR_SQL, [(sid, locale) for sid in found])
            conn.commit()
    verb = "cleared for translation from English" if apply else "would be cleared (dry run)"
    print(f"[{locale}] translated facts with an English source: {len(rows)}; from Swedish, {verb}: {len(found)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
