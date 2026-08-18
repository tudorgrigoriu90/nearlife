"""Generate machine/pending-review species content at national scale (T-135).

For each species in a presence file it produces:
  - fact       : a grounded 1-2 sentence intro from that locale's Wikipedia (CC BY-SA — attributed),
                 never invented and never machine-translated (T-179).
  - whenAndHow : an honest season + habitat line templated from the real active-months data.
  - give/protect: SAFE taxon-level templates (media/content_templates.py) — never per-species
                  plant/release advice.

Emits one row per (species, locale) across every locale registered in templates_i18n (T-181).
The T-136 noise filter is the quality bar; there is no human verification gate (T-177). Writes
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
from media.content_templates import TAXON_FROM_FILE  # noqa: E402
from gbif.species_profile import is_aquatic  # noqa: E402
from media.templates_i18n import LOCALES, strings_for, when_and_how  # noqa: E402
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


def build_localized(
    species: list[dict],
    taxon: str,
    client,
    locales: list[str],
    vernacular: dict | None = None,
) -> list[dict]:
    """One content row per (species, locale).

    Facts are fetched in batches of 50 per locale (T-182) from that locale's own Wikipedia edition
    rather than translated (T-179), so
    a missing article means a null fact in *that* language only. It deliberately does not fall back
    to English: unlabelled English prose inside a Somali card is worse than no fact, and the card
    already handles an absent one (T-146). give/protect/whenAndHow come from the locale's templates
    and are always present, so a language gap never gates the mission (invariant #2).
    """
    vernacular = vernacular or {}
    names = [sp["scientificName"] for sp in species]
    rows = []
    for locale in locales:
        # One batched pass per locale rather than a request per species (T-182). A failure here
        # costs the whole locale's facts, not the run: templates still ship, so the rows remain
        # valid and the facts can be backfilled by re-running.
        try:
            facts = client.fetch_extracts(names, locale)
        except Exception as exc:
            print(f"  ! [{locale}] extract batch failed: {exc}", flush=True)
            facts = {}
        print(f"  [{locale}] {sum(1 for n in names if facts.get(n))}/{len(names)} with a fact", flush=True)
        tpl = strings_for(locale).templates[taxon]
        for sp in species:
            fact = facts.get(sp["scientificName"])
            rows.append(
                {
                    "speciesKey": sp["speciesKey"],
                    "scientificName": sp["scientificName"],
                    "taxonGroup": taxon,
                    "locale": locale,
                    # Null when this locale has no sourced name — never the binomial (T-187), so
                    # the app can render a scientific name as one instead of passing it off as a
                    # common name.
                    "commonName": vernacular.get(str(sp["speciesKey"]), {}).get(locale),
                    "fact": fact,  # None when that edition has no article — never fabricated
                    "factSource": "Wikipedia" if fact else None,
                    "factLicense": "CC BY-SA" if fact else None,
                    "whenAndHow": when_and_how(
                        taxon,
                        sp["months"],
                        locale,
                        aquatic=is_aquatic(
                            vernacular.get(str(sp["speciesKey"]), {}).get("_realms", {})
                        ),
                    ),
                    "give": tpl["give"],
                    "protect": tpl["protect"],
                    "status": "machine",
                    "needsReview": False,  # no human verification gate (T-177)
                    "curationStatus": "noise-filtered",  # T-136 is the quality bar
                }
            )
    return rows


def load_vernacular() -> dict:
    """Names from build_vernacular.py, if it has run. Absent is fine — every card still renders."""
    path = DATA / "vernacular.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8")).get("names", {})


def build(presence_path: Path, client: WikimediaClient, locales: list[str] | None = None) -> dict:
    taxon = taxon_of(presence_path)
    locales = locales or list(LOCALES)
    species = distinct_species(json.loads(presence_path.read_text(encoding="utf-8")))
    print(f"  {len(species)} species x {len(locales)} locales", flush=True)

    content = build_localized(species, taxon, client, locales, load_vernacular())
    with_fact = sum(1 for r in content if r["fact"])

    return {
        "meta": {
            "taxon": taxon,
            "source": presence_path.name,
            "totalSpecies": len(species),
            "locales": locales,
            "rows": len(content),
            "withFact": with_fact,
            "factCoveragePct": round(100 * with_fact / len(content), 1) if content else 0,
            "note": (
                "One row per (species, locale). Facts are SOURCED from each locale's own Wikipedia "
                "edition (CC BY-SA, attributed), never invented and never machine-translated "
                "(T-179); a null fact means that edition has no article, and is not filled from "
                "English. give/protect are safe taxon templates in the row's locale (T-180), never "
                "per-species advice. Quality bar is the T-136 noise filter — no human verification "
                "gate (T-177)."
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
