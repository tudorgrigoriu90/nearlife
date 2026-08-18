"""Fetch vernacular (common) names for every shipped species, in every locale (T-188).

Card titles are the most visible text in the app, and without this every one of the 6,824 shipped
species shows its Latin binomial. GBIF's /species/{key}/vernacularNames returns all languages in a
single call, so one pass covers all 18 locales.

Resumable on purpose: ~6,824 polite calls is around 40 minutes, and a failure at species 6,000 must
not discard the first 5,999. Results are written incrementally to data/vernacular.json and a re-run
skips whatever is already recorded — including species recorded as having *no* name, since "GBIF
holds nothing here" is an answer rather than a gap to retry forever.

Usage:  python pipeline/build_vernacular.py            # every shipped species, resuming
        python pipeline/build_vernacular.py --limit 50 # a short smoke run
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from gbif.client import GbifClient  # noqa: E402
from gbif.noise import SpeciesSignals, classify  # noqa: E402
from gbif.species_profile import parse_species_profile  # noqa: E402
from gbif.vernacular import parse_vernacular_names  # noqa: E402
from media.templates_i18n import LOCALES  # noqa: E402

DATA = Path(__file__).resolve().parent / "data"
OUT = DATA / "vernacular.json"
SAVE_EVERY = 100


def pending_keys(all_keys: list[int], existing: dict) -> list[int]:
    """Species not yet fetched. A recorded empty result counts as fetched.

    An entry lacking `_realms` is treated as pending even though it has names: it was written
    before T-191 added habitat to this pass, and skipping it would leave every species fetched
    earlier permanently without habitat data — invisibly, because the file looks complete. That is
    the characteristic failure of a resumable job whose record shape changes under it.
    """
    return [k for k in all_keys if "_realms" not in (existing.get(str(k)) or {})]


def merge_existing(existing: dict, fresh: dict) -> dict:
    """Fold a batch of fresh results into what is already on disk; fresh wins."""
    merged = dict(existing)
    for key, names in fresh.items():
        merged[str(key)] = names
    return merged


def coverage_report(names_by_key: dict, locales: list[str]) -> dict:
    """Per-locale coverage. Every requested locale appears, including the empty ones.

    An absent line reads as "not checked"; an explicit 0.0% reads as "checked, and GBIF has nothing"
    — which for most of the immigrant-language roster is the true and expected answer.
    """
    total = len(names_by_key)
    report = {}
    for locale in locales:
        named = sum(1 for names in names_by_key.values() if names.get(locale))
        report[locale] = {
            "named": named,
            "total": total,
            "pct": round(100 * named / total, 1) if total else 0.0,
        }
    return report


def shipping_species() -> list[tuple[int, str]]:
    """The species that clear the T-136 noise filter — the v1 catalogue (T-177)."""
    occ: dict[int, int] = {}
    counties: dict[int, set] = {}
    months: dict[int, set] = {}
    names: dict[int, str] = {}
    for path in sorted(DATA.glob("presence_*.json")):
        for r in json.loads(path.read_text(encoding="utf-8"))["records"]:
            key = r["speciesKey"]
            occ[key] = occ.get(key, 0) + r["occurrences"]
            counties.setdefault(key, set()).add(r["county"])
            months.setdefault(key, set()).update(r.get("activeMonths", []))
            names[key] = r["scientificName"]
    kept = []
    for key, name in names.items():
        verdict = classify(
            SpeciesSignals(
                scientific_name=name,
                occurrences=occ[key],
                counties=len(counties[key]),
                months=len(months[key]),
            )
        )
        if verdict.included:
            kept.append((key, name))
    return sorted(kept)


def main(argv: list[str]) -> int:
    limit = None
    if "--limit" in argv:
        limit = int(argv[argv.index("--limit") + 1])

    existing = json.loads(OUT.read_text(encoding="utf-8"))["names"] if OUT.exists() else {}
    species = shipping_species()
    todo = pending_keys([k for k, _ in species], existing)
    if limit is not None:
        todo = todo[:limit]
    print(f"{len(species)} shipped species, {len(existing)} already fetched, {len(todo)} to do", flush=True)

    client = GbifClient()
    fresh: dict[int, dict] = {}
    for i, key in enumerate(todo, 1):
        try:
            # Two calls per species rather than a second full pass (T-191): this loop already walks
            # every shipped species and is already resumable, so habitat rides along.
            names = parse_vernacular_names(client.vernacular_names(key))
            realms = parse_species_profile(client.species_profile(key))
            fresh[key] = {**names, "_realms": realms}
        except Exception as exc:  # one bad species must not end a 40-minute run
            print(f"  ! {key}: {exc}", flush=True)
            continue
        if i % SAVE_EVERY == 0:
            existing = merge_existing(existing, fresh)
            fresh = {}
            _write(existing)
            print(f"  {i}/{len(todo)} fetched", flush=True)

    existing = merge_existing(existing, fresh)
    _write(existing)

    report = coverage_report(existing, list(LOCALES))
    print("\ncoverage by locale:")
    for locale, row in sorted(report.items(), key=lambda kv: -kv[1]["pct"]):
        print(f"  {locale:4s} {row['named']:>6,}/{row['total']:,}  {row['pct']:>5.1f}%")
    return 0


def _write(names: dict) -> None:
    payload = {
        "meta": {
            "source": "GBIF /species/{key}/vernacularNames",
            "species": len(names),
            "coverage": coverage_report(names, list(LOCALES)),
            "note": (
                "Sourced, never translated. A locale with no name falls back to the scientific "
                "name in the app; species names are never machine-translated (T-159/T-187)."
            ),
        },
        "names": names,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
