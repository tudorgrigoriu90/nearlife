"""Build the per-county, per-month species presence dataset for Sweden from GBIF (T-042).

Usage:
    python build_presence.py <TaxonScientificName> [rank]     # e.g. Mammalia CLASS
    python build_presence.py --all                            # all TARGET_TAXA

For each of the 21 counties × 12 months it asks GBIF which species (of the taxon) were recorded
there that month, keeping only CC0/CC-BY records, and aggregates to one record per
(county, species) with the set of active months. Output: data/presence_<key>.json.

This is the authoritative, reproducible way to populate fauna for all Sweden — re-running picks
up new observations. It replaces hand-curation. Bulk per-species monthly precision for the very
rarest species (beyond the facet cap) comes later via the GBIF Occurrence Download API, which
needs a GBIF account.
"""

import json
import sys
from pathlib import Path

# Swedish county names and taxon arrows are non-ASCII; make console logging UTF-8-safe so it
# never crashes on a cp1252 (Windows) terminal.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except (AttributeError, ValueError):
    pass

from gbif.aggregate import build_presence, presence_records
from gbif.client import ALLOWED_LICENSES, GbifClient
from gbif.counties import COUNTY_NAME_BY_GID, SWEDISH_COUNTIES
from gbif.taxa import TARGET_TAXA

DATA_DIR = Path(__file__).resolve().parent / "data"


def build_for_taxon(client: GbifClient, taxon: dict) -> dict:
    key = taxon["key"]
    names = taxon["names"]
    facet_limit = taxon.get("facetLimit", 300)
    min_occ = taxon.get("minOccurrences", 0)

    # Resolve each source name to a taxonKey; skip (with a log) any GBIF can't match exactly.
    taxon_keys = []
    for name in names:
        try:
            tk = client.resolve_taxon_key(name)
            taxon_keys.append(tk)
            print(f"[{key}] {name} -> taxonKey {tk}", flush=True)
        except ValueError as exc:
            print(f"[{key}] SKIP {name}: {exc}", flush=True)
    if not taxon_keys:
        raise ValueError(f"no resolvable GBIF taxa for {key} ({names})")
    print(f"[{key}] facetLimit={facet_limit} minOccurrences={min_occ} keys={taxon_keys}", flush=True)

    rows = []
    truncations = 0
    for county in SWEDISH_COUNTIES:
        for month in range(1, 13):
            for taxon_key in taxon_keys:
                pairs, truncated = client.species_facet(county["gid"], taxon_key, month, facet_limit)
                if truncated:
                    truncations += 1
                for species_key, count in pairs:
                    rows.append((county["gid"], month, species_key, count))
        print(f"  {county['name']:16s} cumulative rows: {len(rows)}", flush=True)

    presence = build_presence(rows)
    # Drop the long tail of rarities (per county) so we keep encounterable species.
    if min_occ > 0:
        presence = {k: v for k, v in presence.items() if v["occurrences"] >= min_occ}
    species_keys = {sk for (_gid, sk) in presence.keys()}
    print(f"  resolving {len(species_keys)} species names…", flush=True)
    species_names = {k: client.scientific_name(k) for k in species_keys}
    records = list(presence_records(presence, COUNTY_NAME_BY_GID, species_names))

    if truncations:
        print(
            f"  WARNING: {truncations} (county,month) facets hit the cap - rarest species beyond "
            f"the top {facet_limit} dropped (refine with the bulk download later).",
            flush=True,
        )
    return {
        "meta": {
            "taxon": key,
            "taxa": names,
            "taxonKeys": taxon_keys,
            "source": "GBIF.org occurrence API",
            "licenses": ALLOWED_LICENSES,
            "counties": len(SWEDISH_COUNTIES),
            "facetLimit": facet_limit,
            "minOccurrences": min_occ,
            "distinctSpecies": len(species_keys),
            "records": len(records),
            "facetTruncations": truncations,
            "note": (
                "Observation-based presence proxy (occurrence != true presence; TSD §7). "
                "CC0/CC-BY records only; encounterable core (top-N by records, minOccurrences "
                "floor). Re-run to refresh."
            ),
        },
        "records": records,
    }


def write_output(key: str, payload: dict) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / f"presence_{key}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"[{key}] wrote {out} — {payload['meta']['distinctSpecies']} species, "
        f"{payload['meta']['records']} county records",
        flush=True,
    )
    return out


def main(argv: list[str]) -> int:
    client = GbifClient()
    if argv and argv[0] == "--all":
        failures = []
        for taxon in TARGET_TAXA:
            try:
                payload = build_for_taxon(client, taxon)
                write_output(taxon["key"], payload)
            except Exception as exc:  # keep going — one taxon failing must not lose the rest
                print(f"[{taxon['key']}] FAILED: {exc}", flush=True)
                failures.append(taxon["key"])
        if failures:
            print(f"Completed with failures: {', '.join(failures)}", flush=True)
        return 1 if failures else 0
    if not argv:
        print(__doc__)
        return 2
    # Single taxon: a configured key (e.g. "reptiles"), else treat argv as GBIF scientific names.
    selected = next((t for t in TARGET_TAXA if t["key"] == argv[0]), None)
    if selected is None:
        selected = {
            "key": argv[0].lower(),
            "names": argv,  # one or more GBIF backbone names to union
            "facetLimit": 300,
            "minOccurrences": 0,
        }
    payload = build_for_taxon(client, selected)
    write_output(selected["key"], payload)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
