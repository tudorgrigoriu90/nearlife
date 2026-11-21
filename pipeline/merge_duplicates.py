"""Merge species that are in the catalogue twice under different GBIF keys (T-373).

GBIF can hold one species under two keys: an accepted one and a "doubtful" or synonym one
(*Huperzia selago*: gbif:8190643 accepted, gbif:2688495 doubtful). Both passed the noise filter,
so the app showed two cards with the records split between them. This finds catalogue species that
share a scientific name, asks GBIF which key is accepted, and folds the others into it with
`public.merge_species` (migration 0051), which also moves users' collection rows.

    SUPABASE_DB_URL=... python pipeline/merge_duplicates.py           # print the plan
    SUPABASE_DB_URL=... python pipeline/merge_duplicates.py --apply   # merge
"""

import argparse
import os
import sys

import requests

GBIF = "https://api.gbif.org/v1/species/"
USER_AGENT = "nearby-nearlife-pipeline/0.1 (species duplicates)"
RANK = {"ACCEPTED": 0, "DOUBTFUL": 1, "SYNONYM": 2, "HETEROTYPIC_SYNONYM": 2, "HOMOTYPIC_SYNONYM": 2}

DUPLICATES_SQL = """
select s.scientific_name, s.id, s.gbif_key, coalesce(p.occ, 0)
  from public.species s
  left join (select species_id, sum(occurrences) occ from public.species_presence group by 1) p on p.species_id = s.id
 where s.in_catalogue
   and s.scientific_name in (select scientific_name from public.species where in_catalogue group by 1 having count(*) > 1)
 order by 1, 2
"""


def choose(candidates: list[dict]) -> tuple[str, list[str]]:
    """(the id to keep, the ids to merge into it).

    A curated species (a non-gbif id) always stays: its hand-written content and photos are keyed
    to it. Then GBIF's accepted key, then the one with more records, then the lower key.
    """

    def key(c: dict):
        curated = not c["id"].startswith("gbif:")
        number = int(c["id"].split(":")[1]) if c["id"].startswith("gbif:") else 0
        return (not curated, RANK.get(c.get("status") or "", 3), -c["occurrences"], number)

    ordered = sorted(candidates, key=key)
    return ordered[0]["id"], [c["id"] for c in ordered[1:]]


def gbif_status(session: requests.Session, gbif_key: int | None) -> str | None:
    if gbif_key is None:
        return None
    resp = session.get(f"{GBIF}{gbif_key}", timeout=30)
    if resp.status_code != 200:
        return None
    return resp.json().get("taxonomicStatus")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="merge; without it only print the plan")
    args = parser.parse_args()
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set")

    import psycopg

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(DUPLICATES_SQL)
        groups: dict[str, list[dict]] = {}
        for name, sid, gbif_key, occ in cur.fetchall():
            groups.setdefault(name, []).append(
                {"id": sid, "status": gbif_status(session, gbif_key), "occurrences": int(occ)}
            )
        merges = 0
        for name, candidates in sorted(groups.items()):
            keep, others = choose(candidates)
            desc = ", ".join(f"{c['id']} {c['status']} {c['occurrences']}" for c in candidates)
            print(f"{name}: keep {keep}; merge {', '.join(others)}  ({desc})")
            if args.apply:
                for other in others:
                    cur.execute("select public.merge_species(%s, %s)", (other, keep))
                    merges += 1
        if args.apply:
            conn.commit()
        print(f"{len(groups)} duplicated names; {merges} merged" if args.apply else f"{len(groups)} duplicated names (dry run)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
