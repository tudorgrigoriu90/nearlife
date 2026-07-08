"""Load the GBIF presence datasets into Supabase (T-045).

Bulk-upserts regions, species (taxonomy), and per-region presence from pipeline/data/presence_*.json
into the public schema. This is the correct home for the ~12k species / ~78k presence rows — far
too large for ad-hoc SQL through a console.

Runs in CI (or locally) with a **service-role** Postgres connection string in $SUPABASE_DB_URL
(never the anon/publishable key). Idempotent (upserts), so re-running after a pipeline refresh is
safe:

    SUPABASE_DB_URL=postgres://...pooler.supabase.com:6543/postgres  python -m gbif.supabase_load
"""

import json
import os
from pathlib import Path

from gbif.counties import SWEDISH_COUNTIES
from gbif.db_rows import build_rows, region_rows

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def load_datasets() -> list[tuple[str, list[dict]]]:
    """Read every presence_*.json as (taxon_key, records)."""
    datasets = []
    for path in sorted(DATA_DIR.glob("presence_*.json")):
        taxon = path.stem[len("presence_") :]
        doc = json.loads(path.read_text())
        datasets.append((taxon, doc["records"]))
    return datasets


def _chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


REGION_SQL = (
    "insert into public.regions (id, name) values (%(id)s, %(name)s) "
    "on conflict (id) do update set name = excluded.name"
)
SPECIES_SQL = (
    "insert into public.species "
    "(id, gbif_key, scientific_name, common_name, category, rarity, taxon_group, vertebrate, active_months) "
    "values (%(id)s, %(gbif_key)s, %(scientific_name)s, %(common_name)s, %(category)s, %(rarity)s, "
    "%(taxon_group)s, %(vertebrate)s, %(active_months)s) "
    "on conflict (id) do update set gbif_key=excluded.gbif_key, scientific_name=excluded.scientific_name, "
    "taxon_group=excluded.taxon_group, vertebrate=excluded.vertebrate, active_months=excluded.active_months"
)
PRESENCE_SQL = (
    "insert into public.species_presence (region_id, species_id, active_months, occurrences) "
    "values (%(region_id)s, %(species_id)s, %(active_months)s, %(occurrences)s) "
    "on conflict (region_id, species_id) do update set "
    "active_months=excluded.active_months, occurrences=excluded.occurrences"
)


def main() -> None:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set (service-role Postgres connection string).")

    import psycopg  # imported lazily so the module imports without the DB driver (tests/CLI help)

    species_rows, presence_rows = build_rows(load_datasets())
    regions = list(region_rows(SWEDISH_COUNTIES))

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.executemany(REGION_SQL, regions)
        for chunk in _chunks(species_rows, 1000):
            cur.executemany(SPECIES_SQL, chunk)
        for chunk in _chunks(presence_rows, 2000):
            cur.executemany(PRESENCE_SQL, chunk)
        conn.commit()

    print(
        f"loaded {len(regions)} regions, {len(species_rows)} species, "
        f"{len(presence_rows)} presence rows"
    )


if __name__ == "__main__":
    main()
