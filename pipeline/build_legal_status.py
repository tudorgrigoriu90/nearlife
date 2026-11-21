"""Legal status for the card (T-336 · review F-01): invasive now, protected next (T-337).

Invasive: the EU list of invasive alien species of Union concern (Regulation (EU) 1143/2014), which
applies in Sweden as in every member state. Keeping, selling, growing and releasing these species is
banned. The list comes from the Research Institute for Nature and Forest's (INBO) checklist on GBIF,
CC0 (doi:10.15468/97aucj, DATA-SOURCING-LICENSING §10), current to the 2025 update; SLU
Artdatabanken's Swedish copy stops before the 2022 one. Records join the catalogue on the GBIF
backbone key (`nubKey` → `gbif:<key>`), species rank only.

Only `invasive` is written here, and every other `invasive` is cleared, so a species taken off the
list loses its line. Invasive replaces `protected` (an invasive bird is still a wild bird under 4 §
of the Species Protection Ordinance, but releasing it is what the card must warn against);
pipeline/build_protected.py (T-337) leaves invasive rows alone.

    SUPABASE_DB_URL=... python pipeline/build_legal_status.py
"""

import os
import sys

UNION_LIST = "79d65658-526c-4c78-9d24-1870d67f8439"
API = "https://api.gbif.org/v1/species/search"


def invasive_ids(records: list[dict]) -> set[str]:
    """Species ids of the species-rank records that carry a backbone key."""
    return {f"gbif:{r['nubKey']}" for r in records if r.get("rank") == "SPECIES" and r.get("nubKey")}


def fetch_records(session, dataset: str = UNION_LIST, page: int = 1000) -> list[dict]:
    records: list[dict] = []
    offset = 0
    while True:
        resp = session.get(API, params={"datasetKey": dataset, "rank": "SPECIES", "limit": page, "offset": offset}, timeout=60)
        resp.raise_for_status()
        body = resp.json()
        records += body.get("results", [])
        if body.get("endOfRecords", True):
            return records
        offset += page


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")

    import psycopg
    import requests

    from resolve_synonyms import USER_AGENT

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    invasive = invasive_ids(fetch_records(session))
    if len(invasive) < 80:
        # The Union list has ~120 species; far fewer means a broken answer, not good news.
        raise SystemExit(f"only {len(invasive)} invasive species came back; refusing to clear the rest")
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("update public.species set legal_status = null where legal_status = 'invasive'")
        cur.executemany(
            # Curated species keep a readable id; their backbone key is in gbif_key.
            "update public.species set legal_status = 'invasive' where id = %(id)s or gbif_key = %(key)s",
            [{"id": i, "key": int(i.removeprefix("gbif:"))} for i in sorted(invasive)],
        )
        cur.execute("select count(*) from public.species where in_catalogue and legal_status = 'invasive'")
        in_catalogue = cur.fetchone()[0]
        conn.commit()
    print(f"Union list: {len(invasive)} species; catalogue species marked invasive: {in_catalogue}")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    sys.exit(main())
