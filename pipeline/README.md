# pipeline/

Python data pipeline: pulls biodiversity + habitat data and loads it into Supabase.
Runs as scheduled GitHub Actions (free CI minutes), not at runtime — see
[../docs/TSD.md §6](../docs/TSD.md) and [../docs/DATA-SOURCING-LICENSING.md](../docs/DATA-SOURCING-LICENSING.md).

## Status
Skeleton only (T-015). Real jobs land in Epic **E3**: GBIF occurrence ingest (CC0/CC-BY
filtered), H3 cell aggregation, per-cell/per-month presence probability, OSM habitat → catch
spots with safety exclusions.

## Local dev

```sh
pip install -r pipeline/requirements.txt
python -m pytest pipeline -q      # run tests
python pipeline/run.py            # run the (placeholder) pipeline
```

## Gating
Pipeline code is gated in **CI** (`.github/workflows/ci.yml` runs `pytest` on push/PR), not in
the local pre-push hook — the hook stays JS/TS-only so no Python toolchain is required locally.
The scheduled runner is `.github/workflows/pipeline.yml`.
