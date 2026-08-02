"""Generate machine/pending-review species content at national scale (T-135).

For each species in a presence file it produces:
  - fact       : a grounded 1-2 sentence intro from Wikipedia (CC BY-SA — attributed), never invented.
  - whenAndHow : an honest season + habitat line templated from the real active-months data.
  - give/protect: SAFE taxon-level templates (media/content_templates.py) — never per-species
                  plant/release advice.

Every entry is status='machine', needsReview=True, curationStatus='uncurated' — it must pass
Director + native review (T-125/T-135) and GBIF-noise curation (T-136) before it ships. Writes
`data/content_<taxon>.json`. Idempotent-ish: re-runs overwrite. Coverage is reported honestly.

Usage:  python pipeline/build_content.py data/presence_mammals.json
        python pipeline/build_content.py --all         # every presence_*.json (long; use CI)
"""

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except (AttributeError, ValueError):
    pass

sys.path.insert(0, str(Path(__file__).parent))
from media.content_templates import TAXON_FROM_FILE, TEMPLATES, when_and_how  # noqa: E402
from media.wikimedia import WikimediaClient  # noqa: E402

DATA = Path(__file__).resolve().parent / "data"


def taxon_of(presence_path: Path) -> str:
    stem = presence_path.stem.replace("presence_", "")
    if stem not in TAXON_FROM_FILE:
        raise SystemExit(f"unknown taxon file '{presence_path.name}' — add it to TAXON_FROM_FILE")
    return TAXON_FROM_FILE[stem]


def distinct_species(presence: dict) -> list[dict]:
    """One record per species with active months unioned across counties."""
    agg: dict[int, dict] = {}
    for r in presence["records"]:
        cur = agg.setdefault(
            r["speciesKey"], {"speciesKey": r["speciesKey"], "scientificName": r["scientificName"], "months": set()}
        )
        cur["months"].update(r.get("activeMonths", []))
    return [{"speciesKey": s["speciesKey"], "scientificName": s["scientificName"], "months": sorted(s["months"])}
            for s in agg.values()]


def build(presence_path: Path, client: WikimediaClient) -> dict:
    taxon = taxon_of(presence_path)
    tpl = TEMPLATES[taxon]
    species = distinct_species(json.loads(presence_path.read_text(encoding="utf-8")))

    content = []
    with_fact = 0
    for i, sp in enumerate(species, 1):
        fact = None
        try:
            fact = client.fetch_extract(sp["scientificName"])
        except Exception as exc:
            print(f"  ! {sp['scientificName']}: {exc}", flush=True)
        if fact:
            with_fact += 1
        content.append(
            {
                "speciesKey": sp["speciesKey"],
                "scientificName": sp["scientificName"],
                "taxonGroup": taxon,
                "fact": fact,  # None when Wikipedia has no article — never fabricated
                "factSource": "Wikipedia" if fact else None,
                "factLicense": "CC BY-SA" if fact else None,
                "whenAndHow": when_and_how(taxon, sp["months"]),
                "give": tpl["give"],
                "protect": tpl["protect"],
                "status": "machine",
                "needsReview": True,
                "curationStatus": "uncurated",  # GBIF-noise curation is T-136
            }
        )
        if i % 50 == 0:
            print(f"  {i}/{len(species)} processed, {with_fact} with a fact", flush=True)

    return {
        "meta": {
            "taxon": taxon,
            "source": presence_path.name,
            "totalSpecies": len(species),
            "withFact": with_fact,
            "factCoveragePct": round(100 * with_fact / len(species), 1) if species else 0,
            "note": (
                "status=machine, needsReview=true. Facts grounded from Wikipedia (CC BY-SA, "
                "attributed), never invented. give/protect are safe taxon templates, not per-species "
                "advice. Curate GBIF noise (T-136) + native review (T-125) before shipping."
            ),
        },
        "content": content,
    }


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    if argv[0] == "--all":
        targets = sorted(DATA.glob("presence_*.json"))
    else:
        raw = Path(argv[0])
        # Accept a cwd-relative path, or fall back to the pipeline data dir by basename.
        targets = [raw if raw.exists() else DATA / raw.name]
    client = WikimediaClient()
    for path in targets:
        if not path.exists():
            print(f"no such file: {path}")
            return 2
        payload = build(path, client)
        out = DATA / f"content_{payload['meta']['taxon']}.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        m = payload["meta"]
        print(f"wrote {out} — {m['withFact']}/{m['totalSpecies']} facts ({m['factCoveragePct']}%)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
