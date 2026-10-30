"""Load catch spots into Supabase (T-048).

Per county, in one transaction: upsert every spot from data/catch_spots_<ISO>.json, flagged ones
included, then delete the county's spots that are gone from OpenStreetMap. Flagged spots are kept
for the density audit (T-050); the table's read policy hides them from every user (T-049).

A county refresh that arrives with far fewer spots than the database holds is refused, as the
species loader does (T-192): a half-finished Overpass fetch and "the county lost most of its picnic
sites" look the same from here, so the data already loaded gets the benefit of the doubt.

    SUPABASE_DB_URL=... python -m osm.load       (from pipeline/; CI: catch-spots.yml)
"""

import json
import os
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
MIN_RATIO = 0.75

UPSERT_SQL = (
    "insert into public.catch_spots (id, region_id, kind, habitat, name, lat, lon, flags, updated_at) "
    "values (%(id)s, %(region_id)s, %(kind)s, %(habitat)s, %(name)s, %(lat)s, %(lon)s, %(flags)s, now()) "
    "on conflict (id) do update set region_id = excluded.region_id, kind = excluded.kind, "
    "habitat = excluded.habitat, name = excluded.name, lat = excluded.lat, lon = excluded.lon, "
    "flags = excluded.flags, updated_at = now()"
)
DELETE_GONE_SQL = "delete from public.catch_spots where region_id = %s and not (id = any(%s))"


def refresh_allowed(existing: int, incoming: int) -> tuple[bool, str]:
    if incoming == 0:
        return False, "refusing an empty county"
    if existing and incoming < existing * MIN_RATIO:
        return False, f"refusing: {existing} → {incoming} spots (below {MIN_RATIO:.0%}); likely a partial fetch"
    return True, ""


def rows(doc: dict) -> list[dict]:
    region = doc["meta"]["region_id"]
    return [{**s, "region_id": region} for s in doc["spots"]]


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set.")
    import psycopg

    failed = []
    with psycopg.connect(dsn) as conn:
        for path in sorted(DATA.glob("catch_spots_*.json")):
            doc = json.loads(path.read_text(encoding="utf-8"))
            region = doc["meta"]["region_id"]
            batch = rows(doc)
            with conn.cursor() as cur:
                cur.execute("select count(*) from public.catch_spots where region_id = %s", (region,))
                ok, why = refresh_allowed(cur.fetchone()[0], len(batch))
                if not ok:
                    print(f"! {path.name}: {why}", flush=True)
                    failed.append(path.name)
                    continue
                cur.executemany(UPSERT_SQL, batch)
                cur.execute(DELETE_GONE_SQL, (region, [s["id"] for s in batch]))
                gone = cur.rowcount
            conn.commit()
            shown = sum(1 for s in batch if not s["flags"])
            print(f"{path.name}: {len(batch)} spots ({shown} shown), {gone} removed", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
