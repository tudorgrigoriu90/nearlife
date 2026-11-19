# pipeline/

Python data pipeline: pulls biodiversity, habitat and media data and loads it into Supabase.
It runs as manually dispatched GitHub Actions (free CI minutes), never at app runtime — see
[../docs/TSD.md §6](../docs/TSD.md) and [../docs/DATA-SOURCING-LICENSING.md](../docs/DATA-SOURCING-LICENSING.md).

## Jobs and the workflows that run them

| Workflow | What it does |
|----------|--------------|
| `data-pipeline.yml` | GBIF presence per county and month (`build_presence.py`), the noise-filtered catalogue (`catalogue.py`), species content (`build_content.py`; `content_scope` = `all`, `missing`, a file, or `skip`), vernacular names, and the load into Supabase |
| `species-names.yml` | Vernacular names (`build_vernacular.py`, `resolve_synonyms.py`) |
| `species-photos.yml` | Hero photos and thumbnails (`build_species_photos.py`, `build_species_thumbs.py`) |
| `species-sounds.yml` | Bird song (`build_species_sounds.py`) |
| `translate-facts.yml` | Machine translation of facts into the immigrant-language roster (`translate_facts.py`) |
| `backfill-facts.yml` | Facts for species that had none, and the Wikipedia source of each (`backfill_facts.py`, `backfill_fact_sources.py`) |
| `catch-spots.yml` | OSM catch spots with the safety exclusions (`osm/`) |
| `db-migrate.yml` | Applies `supabase/migrations` (`db/migrate.py`) and checks the live project (`db/verify.py`) |
| `health.yml` | Daily checks on the live data (`db/health.py`) |

## Local dev

```sh
pip install -r pipeline/requirements.txt
python -m pytest pipeline -q      # run tests
```

Tests marked `needs_pg` run against a real Postgres when `NEARBY_PG_TEST_URL` is set (CI starts
one; see `tests/pg_harness.py`) and are skipped otherwise.

## Gating
Pipeline code is gated in **CI** (`.github/workflows/ci.yml` runs `pytest` on push/PR) — the
authoritative quality gate (there is no local git hook; see [CLAUDE.md](../CLAUDE.md), T-142).
