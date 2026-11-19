"""Sweden's own Red List category, for the card (T-332 · review I-35).

The worldwide IUCN category (T-263) can say Least Concern for a species that is threatened in
Sweden, and the reverse. SLU Artdatabanken publishes the Swedish Red List 2025 on GBIF as a CC0
checklist (doi:10.15468/zbbyqv, DATA-SOURCING-LICENSING §6), each record linked to the GBIF backbone
by `nubKey`, which is what our species ids are built from (`gbif:<key>`).

The list holds only red-listed taxa, so a species missing from it is "not red-listed", never
"least concern": the card then says nothing. Near threatened and worse are stored, plus regionally
extinct; data deficient is not, as for the worldwide line. Every other species is set back to null,
so a species taken off the list loses its line on the next run.

    SUPABASE_DB_URL=... python pipeline/build_redlist_se.py
"""

import os
import sys

DATASET = "87e639cc-30a9-4007-bd2c-b0cab60326b9"  # The Swedish Red List 2025, SLU Artdatabanken
API = "https://api.gbif.org/v1/species/search"

CODE_BY_STATUS = {
    "NEAR_THREATENED": "NT",
    "VULNERABLE": "VU",
    "ENDANGERED": "EN",
    "CRITICALLY_ENDANGERED": "CR",
    "REGIONALLY_EXTINCT": "RE",
}
# Worst first: a backbone key reached by two records takes the more threatened one.
_SEVERITY = ["RE", "CR", "EN", "VU", "NT"]


def statuses_from_records(records: list[dict]) -> dict[str, str]:
    """{species id: code} for species-rank records with a backbone key and a kept category."""
    out: dict[str, str] = {}
    for r in records:
        if r.get("rank") != "SPECIES" or not r.get("nubKey"):
            continue
        codes = [CODE_BY_STATUS[s] for s in r.get("threatStatuses") or [] if s in CODE_BY_STATUS]
        if not codes:
            continue
        code = min(codes, key=_SEVERITY.index)
        sid = f"gbif:{r['nubKey']}"
        if sid not in out or _SEVERITY.index(code) < _SEVERITY.index(out[sid]):
            out[sid] = code
    return out


def fetch_records(session, page: int = 1000) -> list[dict]:
    """Every species-rank record of the list carrying a kept category."""
    records: list[dict] = []
    offset = 0
    while True:
        params = {
            "datasetKey": DATASET,
            "rank": "SPECIES",
            "threat": list(CODE_BY_STATUS),
            "limit": page,
            "offset": offset,
        }
        resp = session.get(API, params=params, timeout=60)
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
    status = statuses_from_records(fetch_records(session))
    if len(status) < 1000:
        # The 2025 list has ~4,700 kept species; far fewer means a broken answer, not a better year.
        raise SystemExit(f"only {len(status)} red-listed species came back; refusing to clear the rest")
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("update public.species set redlist_se = null where redlist_se is not null")
        cur.executemany(
            "update public.species set redlist_se = %(code)s where id = %(id)s",
            [{"id": i, "code": c} for i, c in sorted(status.items())],
        )
        cur.execute("select redlist_se, count(*) from public.species where in_catalogue and redlist_se is not null group by 1")
        counts = dict(cur.fetchall())
        conn.commit()
    print(f"Swedish Red List: {len(status)} species on the list; catalogue species with a line: {counts}")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    sys.exit(main())
