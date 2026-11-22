"""Romanian common names from the first sentence of Romanian Wikipedia facts (T-393).

GBIF and Wikidata (stated names, article titles, labels) hold a Romanian name for few Swedish
species: 411 of 2,584 plants, 58 of 6,255 insects. Romanian Wikipedia often files a species under
its Latin name but gives the popular one in the first sentence ("Sorbus aucuparia, numită în mod
obișnuit scoruș de munte, …"; "Pirul târâtor (Elymus repens) este …"). This reads it from there.

Strict on purpose: only the language's own Wikipedia text (`fact_origin = 'wikipedia'`; a machine
translation invents names), only a name said right after the scientific name or right before it
in brackets, only the first of several, and only into an empty `common_name` slot. Anything else
is left without a name rather than guessed.

    SUPABASE_DB_URL=... python pipeline/names_from_facts.py
"""

from __future__ import annotations

import os
import re
import sys

_LETTERS = "a-zăâîșțşţA-ZĂÂÎȘȚŞŢ"
_VERB = (
    r"(?:(?:numit|denumit|cunoscut|supranumit)[ăa]?|denumirile populare|denumirea populară)"
    r"(?: și)?(?: în mod obișnuit| popular| comun| tradițional| colocvial)?(?: și)?"
    r"(?: sub (?:numele|denumirea)(?: comun| populară)?(?: de)?| ca)?"
)
_NAME = rf"[„\"]?([{_LETTERS}][{_LETTERS}\- ]{{1,60}}?)(?=[”\",;.()]| sau | este | și |$)"
# Words that mean the phrase described the species instead of naming it.
_NOT_A_NAME = {"specie", "specii", "gen", "genul", "familia", "familie", "plantă", "plante", "din", "este"}


def name_from_ro_fact(fact: str | None, scientific: str) -> str | None:
    if not fact or not scientific:
        return None
    text = re.sub(r"\s+", " ", fact.strip())
    sci = re.escape(scientific.strip())
    after = re.match(rf"^{sci}(?: [A-Z][a-z]{{0,3}}\.?)?[ ,(\-–]+{_VERB} {_NAME}", text)
    before = re.match(rf"^([{_LETTERS}][{_LETTERS}\-]+(?: [{_LETTERS}\-]+){{0,4}}) \({sci}\)", text)
    match = after or before
    if not match:
        return None
    name = match.group(1).strip(" -„”\"")
    words = name.split()
    if not 1 <= len(words) <= 5 or any(w.lower() in _NOT_A_NAME for w in words):
        return None
    if name.lower() == scientific.lower():
        return None
    return name


ROWS_SQL = """
select c.species_id, s.scientific_name, c.fact
from public.species_content c
join public.species s on s.id = c.species_id and s.in_catalogue
where c.locale = 'ro' and c.fact_origin = 'wikipedia' and c.common_name is null and c.fact is not null
"""

UPDATE_SQL = "update public.species_content set common_name = %s where species_id = %s and locale = 'ro' and common_name is null"


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(ROWS_SQL)
        rows = cur.fetchall()
        found = [(name, sid) for sid, sci, fact in rows if (name := name_from_ro_fact(fact, sci))]
        cur.executemany(UPDATE_SQL, found)
        conn.commit()
    print(f"Romanian Wikipedia facts without a name: {len(rows)}; names found in the text: {len(found)}")
    for name, sid in found:
        print(f"  {sid}: {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
