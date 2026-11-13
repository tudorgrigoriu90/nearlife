"""Worldwide threat status (IUCN Red List category) from Wikidata, for the card (T-263).

Wikidata's P141 holds the IUCN category, CC0, for ~1,350 catalogue species. Only near threatened
and worse is stored (`species.iucn_status`); every other species is set back to null, so a species
whose status improves loses its badge on the next run. Looked up by scientific name (P225).

    SUPABASE_DB_URL=... python pipeline/build_iucn_status.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# Wikidata items for the IUCN categories that get a badge.
STATUS_BY_ITEM = {
    "Q719675": "NT",  # near threatened
    "Q278113": "VU",  # vulnerable
    "Q11394": "EN",  # endangered
    "Q219127": "CR",  # critically endangered
    "Q239509": "EW",  # extinct in the wild
    "Q237350": "EX",  # extinct
}

_QUERY = """SELECT ?name ?status WHERE { VALUES ?name { %s } ?i wdt:P225 ?name . ?i wdt:P141 ?status }"""
# Worst first: when Wikidata lists two categories for one name, the more threatened one wins.
_SEVERITY = ["EX", "EW", "CR", "EN", "VU", "NT"]


def statuses_from_rows(rows: list[dict]) -> dict[str, str]:
    """{scientific name: category} for the badge-worthy categories only."""
    out: dict[str, str] = {}
    for r in rows:
        name = r.get("name", {}).get("value", "")
        code = STATUS_BY_ITEM.get(r.get("status", {}).get("value", "").rsplit("/", 1)[-1])
        if not (name and code):
            continue
        if name not in out or _SEVERITY.index(code) < _SEVERITY.index(out[name]):
            out[name] = code
    return out


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")

    import psycopg

    from resolve_synonyms import Wikidata

    wd = Wikidata()
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("select scientific_name from public.species where in_catalogue order by 1")
        names = [r[0] for r in cur.fetchall()]
        status = statuses_from_rows(wd.batched(_QUERY, names, 250))
        cur.execute("update public.species set iucn_status = null where iucn_status is not null")
        cur.executemany(
            "update public.species set iucn_status = %(status)s where scientific_name = %(name)s",
            [{"name": n, "status": s} for n, s in sorted(status.items())],
        )
        conn.commit()
    counts: dict[str, int] = {}
    for s in status.values():
        counts[s] = counts.get(s, 0) + 1
    print(f"threat status set for {len(status)} species: {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
