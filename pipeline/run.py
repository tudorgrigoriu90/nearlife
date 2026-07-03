"""Nearby data pipeline — entrypoint.

Placeholder skeleton (T-015). The real jobs (GBIF occurrence ingest with CC0/CC-BY
filtering, H3 aggregation, per-cell/per-month probability, OSM habitat → catch spots)
land in Epic E3. See docs/TSD.md §6 and docs/DATA-SOURCING-LICENSING.md.
"""


def pipeline_ok() -> bool:
    """Trivial health check so the skeleton has a real, testable unit."""
    return True


def main() -> None:
    if pipeline_ok():
        print("nearby pipeline: skeleton OK - real jobs land in E3 (see docs/TSD.md section 6).")


if __name__ == "__main__":
    main()
