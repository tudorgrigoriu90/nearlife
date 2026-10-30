"""Load the GBIF presence datasets into Supabase (T-045).

Bulk-upserts regions, species (taxonomy), and per-region presence from pipeline/data/presence_*.json
into the public schema. This is the correct home for the ~12k species / ~78k presence rows — far
too large for ad-hoc SQL through a console.

Runs in CI (or locally) with a **privileged** Postgres connection string in $SUPABASE_DB_URL
(the `postgres` role, which bypasses RLS — never an API key of any kind). Idempotent (upserts), so re-running after a pipeline refresh is
safe:

    SUPABASE_DB_URL=postgres://...pooler.supabase.com:5432/postgres  python -m gbif.supabase_load

Use the SESSION pooler (5432), not the direct host and not transaction mode (6543): the
direct host is IPv6-only and unreachable from CI, and transaction mode rejects the
prepared statements psycopg3 creates for these executemany calls. See gbif/connect.py.
"""

import json
import os
from pathlib import Path

from gbif.load_guard import check_load_sanity
from gbif.db_rows import (
    adopt_existing_ids,
    build_rows,
    regions_from_records,
    taxon_key_for,
)

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def load_datasets() -> list[tuple[str, list[dict]]]:
    """Read every presence_*.json as (taxon_key, records)."""
    datasets = []
    for path in sorted(DATA_DIR.glob("presence_*.json")):
        taxon = taxon_key_for(path.stem[len("presence_") :])
        doc = json.loads(path.read_text())
        datasets.append((taxon, doc["records"]))
    return datasets


def load_vernacular() -> dict:
    """build_vernacular.py's names, if it has run this cycle. Absent is fine — names stay null."""
    path = DATA_DIR / "vernacular.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8")).get("names", {})


def _chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


REGION_SQL = (
    "insert into public.regions (id, name) values (%(id)s, %(name)s) "
    "on conflict (id) do update set name = excluded.name"
)
_SPECIES_INSERT = (
    "insert into public.species "
    "(id, gbif_key, scientific_name, common_name, category, rarity, taxon_group, vertebrate, active_months, "
    "catch_habitats) "
    "values (%(id)s, %(gbif_key)s, %(scientific_name)s, %(common_name)s, %(category)s, %(rarity)s, "
    "%(taxon_group)s, %(vertebrate)s, %(active_months)s, %(catch_habitats)s) "
    "on conflict (id) do update set gbif_key=excluded.gbif_key, scientific_name=excluded.scientific_name, "
    "taxon_group=excluded.taxon_group, vertebrate=excluded.vertebrate, active_months=excluded.active_months, "
)


def species_sql(have_names: bool) -> str:
    """The species upsert, choosing how `common_name` is updated (T-210).

    With fresh vernacular data, a GBIF row's name follows it — null included, which is also what
    clears the binomial copies an early load wrote into 11,883 rows. Without it (a run that skipped
    the name fetch; vernacular.json is not committed), names are left as they are apart from
    clearing those binomial copies — otherwise one partial run would erase every name. Curated rows
    always keep their hand-written name; GBIF only fills one that is missing.
    """
    gbif_name = "excluded.common_name" if have_names else (
        "nullif(public.species.common_name, public.species.scientific_name)"
    )
    # Catch habitats (T-047) follow the same rule: fresh realm data replaces them; without it the
    # group default only fills a gap, never overwriting habitats a richer run already wrote.
    habitats = (
        "excluded.catch_habitats" if have_names
        else "coalesce(public.species.catch_habitats, excluded.catch_habitats)"
    )
    return _SPECIES_INSERT + (
        f"catch_habitats = {habitats}, "
        f"common_name = case when left(public.species.id, 5) = 'gbif:' then {gbif_name} "
        "else coalesce(public.species.common_name, excluded.common_name) end"
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
        raise SystemExit("SUPABASE_DB_URL not set (privileged Postgres connection string).")

    import psycopg  # imported lazily so the module imports without the DB driver (tests/CLI help)

    from gbif.connect import connection_hint

    datasets = load_datasets()
    vernacular = load_vernacular()
    species_rows, presence_rows = build_rows(datasets, vernacular)
    # Regions come from the data, not from a country constant: presence rows carry an FK to
    # regions, so a Nordic ingest that inserted only Sweden's counties would fail the whole
    # transaction on the first Norwegian row (T-167).
    regions = list(regions_from_records(datasets))

    try:
        conn_ctx = psycopg.connect(dsn)
    except psycopg.OperationalError as err:
        hint = connection_hint(dsn, str(err))
        raise SystemExit(f"{err}\n\nLikely cause: {hint}" if hint else str(err)) from err

    with conn_ctx as conn, conn.cursor() as cur:
        # The curated species already hold gbif_keys, and species.gbif_key is uniquely indexed, so
        # minting gbif:<key> for one of them aborts the whole transaction. Adopt the existing id
        # instead: same animal, and the curated id is what content and photos are keyed to.
        cur.execute("select gbif_key, id from public.species where gbif_key is not null")
        existing = {int(k): i for k, i in cur.fetchall()}
        species_rows, presence_rows = adopt_existing_ids(species_rows, presence_rows, existing)
        print(f"adopted {sum(1 for r in species_rows if not r['id'].startswith('gbif:'))} curated ids")

        # The annual refresh runs unattended (T-172), so the sanity check that a person would
        # have applied has to be automatic. Refuse a load that arrives with far less data than the
        # database already holds: a partial ingest and a real decline look identical from here.
        cur.execute("select count(*) from public.species")
        have_species = cur.fetchone()[0]
        cur.execute("select count(*) from public.species_presence")
        have_presence = cur.fetchone()[0]
        verdict = check_load_sanity(
            {"species": have_species, "presence": have_presence},
            {"species": len(species_rows), "presence": len(presence_rows)},
        )
        if not verdict.ok:
            raise SystemExit(verdict.reason)

        cur.executemany(REGION_SQL, regions)
        for chunk in _chunks(species_rows, 1000):
            cur.executemany(species_sql(bool(vernacular)), chunk)
        for chunk in _chunks(presence_rows, 2000):
            cur.executemany(PRESENCE_SQL, chunk)
        conn.commit()

    print(
        f"loaded {len(regions)} regions, {len(species_rows)} species, "
        f"{len(presence_rows)} presence rows"
    )


if __name__ == "__main__":
    main()
