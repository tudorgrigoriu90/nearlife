"""Generate lib/species/names.<locale>.ts from Wikidata + Wikipedia (T-159).

    python pipeline/build_vernacular_names.py ga GA
    python pipeline/build_vernacular_names.py mt MT --dry-run

Written for Irish and Maltese, the two EU languages T-154 could not hand-author: most of the 54
Kronoberg species do not occur in Ireland and almost none occur in Malta, so much of the list has
no traditional name and authoring one would mean inventing it. Works for any locale.

Exits non-zero, printing the gaps, if any species has no attested name — see
vernacular/sources.emit_names_module for why a partial locale is worse than an absent one.

Note: query.wikidata.org and en.wikipedia.org are refused (403) by the sandbox/CI egress policy at
the time of writing, so run this where Wikimedia is reachable.
"""

import argparse
import re
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vernacular.client import VernacularClient  # noqa: E402
from vernacular.sources import (  # noqa: E402
    emit_names_module,
    merge_sources,
    names_from_sitelinks,
    names_from_sparql,
    unsourced,
)

REPO = Path(__file__).resolve().parents[1]
SPECIES_TS = REPO / "lib" / "species" / "kronoberg.ts"
_ROW = re.compile(r"\{ id: '([^']+)', scientificName: '([^']+)'")


def load_species() -> list:
    """[(id, scientific name)] read from the seed list, so the two can never drift apart."""
    rows = _ROW.findall(SPECIES_TS.read_text(encoding="utf-8"))
    if not rows:
        raise SystemExit(f"no species parsed from {SPECIES_TS} — has the seed list format changed?")
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("locale", help="content locale code, e.g. ga")
    ap.add_argument("prefix", help="exported const prefix, e.g. GA (yields GA_NAMES)")
    ap.add_argument("--dry-run", action="store_true", help="report coverage, write nothing")
    args = ap.parse_args()

    species = load_species()
    scientific = [sci for _, sci in species]

    client = VernacularClient()
    try:
        common = names_from_sparql(client.common_names(scientific, args.locale))
        titles = names_from_sitelinks(client.article_titles(scientific, args.locale))
    except requests.exceptions.ProxyError as err:
        # The expected failure in this repo's sandbox/CI: the egress policy refuses Wikimedia.
        # Say so plainly instead of a traceback — the fix is where you run this, not the code.
        print(
            f"egress blocked: cannot reach Wikidata/Wikipedia from here ({err.__class__.__name__})."
            "\nRun this from an environment allowed to reach query.wikidata.org and"
            "\nen.wikipedia.org, then commit the generated file.",
            file=sys.stderr,
        )
        return 2
    names = merge_sources(common, titles)

    gaps = unsourced(species, names)
    print(
        f"{args.locale}: {len(species) - len(gaps)}/{len(species)} sourced "
        f"({len(common)} common-name statements, {len(titles)} article titles)"
    )
    if gaps:
        print(f"\n{len(gaps)} species with no attested {args.locale} name:", file=sys.stderr)
        for sid, sci in gaps:
            print(f"  {sid:32} {sci}", file=sys.stderr)
        print(
            "\nSupply these from a language authority (Irish: téarma.ie, the National Biodiversity"
            "\nData Centre; Maltese: BirdLife Malta's checklist) before registering the locale."
            "\nDo not invent them — an unoffered language is honest, a fabricated one is not.",
            file=sys.stderr,
        )
        return 1

    module = emit_names_module(args.locale, args.prefix, species, names)
    if args.dry_run:
        print(module)
        return 0

    out = REPO / "lib" / "species" / f"names.{args.locale}.ts"
    out.write_text(module, encoding="utf-8")
    print(f"wrote {out.relative_to(REPO)}")
    print("next: author content.<locale>.ts, then register with the T-154 pattern")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
