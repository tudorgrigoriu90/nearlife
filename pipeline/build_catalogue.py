"""Write the v1 shipping catalogue to data/catalogue.json (T-136).

Runs the noise filter over every presence dataset and records both verdicts — what ships, what does
not, and why. Cheap and offline: it reads the presence files the ingest already produced.

Usage:  python pipeline/build_catalogue.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from gbif.catalogue import build_catalogue, catalogue_summary  # noqa: E402
from gbif.db_rows import taxon_key_for  # noqa: E402

DATA = Path(__file__).resolve().parent / "data"
OUT = DATA / "catalogue.json"


def load_datasets() -> list[tuple[str, list[dict]]]:
    datasets = []
    for path in sorted(DATA.glob("presence_*.json")):
        taxon = taxon_key_for(path.stem[len("presence_") :])
        datasets.append((taxon, json.loads(path.read_text(encoding="utf-8"))["records"]))
    return datasets


def main() -> int:
    catalogue = build_catalogue(load_datasets())
    summary = catalogue_summary(catalogue)
    OUT.write_text(
        json.dumps(
            {
                "meta": {
                    **summary,
                    "note": (
                        "The v1 catalogue (T-177): every species clearing the T-136 noise filter "
                        "ships. Exclusions are listed with their reasons so a drop can be argued "
                        "with — and so a mis-tuned threshold is visible as something obviously "
                        "common appearing in `excluded`."
                    ),
                },
                **catalogue,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(
        f"catalogue: {summary['includedSpecies']:,} species ship "
        f"({summary['includedObservationPct']}% of observations), "
        f"{summary['excludedSpecies']:,} filtered out"
    )
    print("\ntop 10 excluded by observation count (sanity-check the threshold here):")
    for e in catalogue["excluded"][:10]:
        print(f"  {e['occurrences']:>7,}  {e['scientificName']:32s} {e['reason']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
