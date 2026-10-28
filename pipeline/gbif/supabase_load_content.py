"""Load generated species content into Supabase `public.species_content` (T-145).

The "content JSON -> table" step called for by T-135/T-144 — the last pipeline piece before the
~12k species can render from the DB (T-057/T-059). Upserts locale-keyed fact / when-how / give /
protect rows from pipeline/data/content_*.json. Every species is loaded — those with no Wikipedia
article get a mission-only row with `fact = NULL` (T-146), so give/protect stay free for every
species (invariant #2); a fact is never fabricated (invariant #1). English (status=machine) content
only — Swedish arrives after the review-gated translation (T-127/T-135).

Run order: the species/presence loader (gbif.supabase_load) must run first — species_content.species_id
FK-references public.species. Runs in CI (or locally) with a **privileged** Postgres connection
string in $SUPABASE_DB_URL (the `postgres` role — never an API key of any kind). Idempotent (upsert):

    SUPABASE_DB_URL=postgres://...pooler.supabase.com:5432/postgres  python -m gbif.supabase_load_content

Use the SESSION pooler (5432), not the direct host and not transaction mode (6543): the
direct host is IPv6-only and unreachable from CI, and transaction mode rejects the
prepared statements psycopg3 creates for these executemany calls. See gbif/connect.py.
"""

import json
import os
from pathlib import Path

from gbif.content_rows import build_content_rows, keep_known_species

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def load_content_files() -> list[dict]:
    """Read every content_*.json payload (build_content.py output)."""
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(DATA_DIR.glob("content_*.json"))
    ]


# More orphans than this means the content and species data come from different runs, and loading
# the remainder would quietly ship a catalogue with holes in it. Below it, report and carry on.
MAX_ORPHAN_SHARE = 0.01


def check_orphans(total_rows: int, missing_species: set[str], orphan_rows: int) -> None:
    if orphan_rows and orphan_rows > total_rows * MAX_ORPHAN_SHARE:
        sample = ", ".join(sorted(missing_species)[:5])
        raise SystemExit(
            f"{orphan_rows} of {total_rows} content rows reference species that are not in "
            f"public.species (e.g. {sample}). Content and species data look like they come from "
            "different runs — refusing to load."
        )


def _chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


CONTENT_SQL = (
    "insert into public.species_content "
    "(species_id, locale, common_name, fact, when_how, give, protect, always_free) "
    "values (%(species_id)s, %(locale)s, %(common_name)s, %(fact)s, %(when_how)s, "
    "%(give)s, %(protect)s, %(always_free)s) "
    "on conflict (species_id, locale) do update set "
    "common_name=excluded.common_name, fact=excluded.fact, when_how=excluded.when_how, "
    "give=excluded.give, protect=excluded.protect, always_free=excluded.always_free"
)


def main() -> None:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set (privileged Postgres connection string).")

    import psycopg  # imported lazily so the module imports without the DB driver (tests/CLI help)

    from gbif.connect import connection_hint

    payloads = load_content_files()
    if not payloads:
        # Nothing to load is a no-op, not a failure: it means build_content.py did not run this
        # cycle (content_scope=skip), and failing here would redden a pipeline whose real work
        # succeeded. Distinguished from a *failed* load, which raises below.
        print("no content_*.json found — nothing to load (did build_content.py run?)")
        return

    try:
        conn_ctx = psycopg.connect(dsn)
    except psycopg.OperationalError as err:
        hint = connection_hint(dsn, str(err))
        raise SystemExit(f"{err}\n\nLikely cause: {hint}" if hint else str(err)) from err

    with conn_ctx as conn, conn.cursor() as cur:
        cur.execute(
            "select gbif_key, id from public.species where gbif_key is not null and left(id, 5) <> 'gbif:'"
        )
        curated = {int(k): i for k, i in cur.fetchall()}
        cur.execute("select id from public.species")
        known = {r[0] for r in cur.fetchall()}

        rows, summary = build_content_rows(payloads, curated_id_by_gbif_key=curated)
        kept, missing = keep_known_species(rows, known)
        check_orphans(len(rows), missing, len(rows) - len(kept))

        for chunk in _chunks(kept, 1000):
            cur.executemany(CONTENT_SQL, chunk)
        conn.commit()

    print(
        f"loaded {len(kept)} content rows from {summary['total']} generated items "
        f"({summary['with_fact']} with a fact, {summary['without_fact']} mission-only, "
        f"{summary['skipped_dup']} dup, {summary['skipped_curated']} kept as hand-written curated "
        f"content, {len(rows) - len(kept)} orphan rows for {len(missing)} unknown species skipped)"
    )


if __name__ == "__main__":
    main()
