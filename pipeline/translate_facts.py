"""Fill missing second-language facts by free, offline machine translation (T-235).

Facts are sourced from each language's own Wikipedia (T-179), and small editions barely cover
Swedish species. Director's decision (2026-11-01): fill the gaps by translating the English
Wikipedia fact with Argos Translate, an open-source model that runs on the CI runner, at $0. The
second language already shows the "Machine-translated" label (T-152), which covers these facts.

Rules:
- Only rows whose fact is NULL are written; a language's own Wikipedia fact always wins.
- Source: the English fact, else the Swedish one routed through English (Argos models are pairs
  with English). English and Swedish themselves are never targets.
- A language Argos has no model for is skipped and keeps its gaps; nothing falls back to English.
- Names are never translated: a translated species name is an invented one.

Runs per language (the Translate facts workflow fans out over TARGET_LOCALES):

    SUPABASE_DB_URL=postgres://... python pipeline/translate_facts.py ro
"""

from __future__ import annotations

import os
import sys
from collections.abc import Callable
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from media.templates_i18n import LOCALES  # noqa: E402

TARGET_LOCALES: list[str] = [loc for loc in LOCALES if loc not in ("en", "sv")]

Translate = Callable[[str, str, str], str]


def plan_translations(rows: list[dict]) -> list[tuple[str, str, str]]:
    """(species_id, source text, source language) for every row with an English or Swedish fact."""
    plan = []
    for r in rows:
        if r.get("en"):
            plan.append((r["species_id"], r["en"], "en"))
        elif r.get("sv"):
            plan.append((r["species_id"], r["sv"], "sv"))
    return plan


def translate_missing(plan: list[tuple[str, str, str]], target: str, translate: Translate) -> dict[str, str]:
    """species_id -> translated fact. A failed or empty translation is left out, never written."""
    out: dict[str, str] = {}
    for species_id, text, src in plan:
        try:
            english = translate(text, "sv", "en") if src == "sv" else text
            result = translate(english, "en", target).strip()
        except Exception as exc:  # one bad sentence must not cost the language
            print(f"  ! {species_id}: {exc}", flush=True)
            continue
        if result and result != text and result != english:
            out[species_id] = result
    return out


def argos_translator(target: str) -> Translate | None:
    """Install the en->target (and sv->en) models; None when Argos has no model for target."""
    import argostranslate.package as pkg
    import argostranslate.translate as tr

    pkg.update_package_index()
    available = pkg.get_available_packages()

    def install(src: str, dst: str) -> bool:
        match = next((p for p in available if p.from_code == src and p.to_code == dst), None)
        if match is None:
            return False
        pkg.install_from_path(match.download())
        return True

    if not install("en", target):
        return None
    install("sv", "en")  # optional: without it, Swedish-only facts are skipped (translate raises)
    return lambda text, src, dst: tr.translate(text, src, dst)


MISSING_SQL = """
select t.species_id, en.fact, sv.fact
from public.species_content t
join public.species s on s.id = t.species_id and s.in_catalogue
left join public.species_content en on en.species_id = t.species_id and en.locale = 'en'
left join public.species_content sv on sv.species_id = t.species_id and sv.locale = 'sv'
where t.locale = %s and t.fact is null and (en.fact is not null or sv.fact is not null)
"""

UPDATE_SQL = (
    "update public.species_content set fact = %s "
    "where species_id = %s and locale = %s and fact is null"
)


def main(argv: list[str]) -> int:
    if len(argv) != 1 or argv[0] not in TARGET_LOCALES:
        print(f"usage: translate_facts.py <locale>, one of {' '.join(TARGET_LOCALES)}")
        return 2
    target = argv[0]
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set (privileged Postgres connection string).")

    translate = argos_translator(target)
    if translate is None:
        print(f"[{target}] no Argos model — skipped; this language keeps Wikipedia facts only")
        return 0

    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(MISSING_SQL, (target,))
        rows = [{"species_id": a, "en": b, "sv": c} for a, b, c in cur.fetchall()]
        plan = plan_translations(rows)
        print(f"[{target}] {len(plan)} facts to translate", flush=True)
        done = translate_missing(plan, target, translate)
        cur.executemany(UPDATE_SQL, [(fact, sid, target) for sid, fact in done.items()])
        conn.commit()
    print(f"[{target}] wrote {len(done)} machine-translated facts", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
