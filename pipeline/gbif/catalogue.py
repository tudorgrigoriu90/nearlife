"""The v1 shipping catalogue as an artefact, not an opinion (T-136).

The noise filter has been run ad hoc to answer "how many species ship?", but its verdict was never
written down. That makes the catalogue something recomputed on demand: nothing downstream can read
it, nobody can diff two runs, and a species that quietly stops qualifying leaves no trace.

**Exclusions are recorded with their reasons**, not just the survivors. A species dropped silently
cannot be argued with later, and "why isn't the mourning dove in the app?" deserves a better answer
than "re-run the filter and see". The excluded list is also where a mis-tuned threshold becomes
visible — if something obviously common appears in it, the policy is wrong, and that is only
noticeable if the list exists.
"""

from collections import defaultdict

from gbif.noise import SpeciesSignals, classify


def build_catalogue(datasets: list[tuple[str, list[dict]]]) -> dict:
    """Run the noise filter over every presence dataset, keeping both verdicts."""
    occ: dict[str, int] = defaultdict(int)
    counties: dict[str, set] = defaultdict(set)
    months: dict[str, set] = defaultdict(set)
    keys: dict[str, int] = {}
    taxa: dict[str, str] = {}

    for taxon, records in datasets:
        for r in records:
            name = r["scientificName"]
            occ[name] += r["occurrences"]
            counties[name].add(r["county"])
            months[name].update(r.get("activeMonths", []))
            keys[name] = r["speciesKey"]
            taxa.setdefault(name, taxon)

    included, excluded = [], []
    for name in occ:
        verdict = classify(
            SpeciesSignals(
                scientific_name=name,
                occurrences=occ[name],
                counties=len(counties[name]),
                months=len(months[name]),
            )
        )
        entry = {
            "speciesKey": keys[name],
            "scientificName": name,
            "taxon": taxa[name],
            "occurrences": occ[name],
            "counties": len(counties[name]),
            "months": sorted(months[name]),
            "reason": verdict.reason,
        }
        (included if verdict.included else excluded).append(entry)

    # Commonest first: the head of this list is what most users will ever meet, so it is the part
    # worth reading when checking the filter by eye.
    included.sort(key=lambda e: (-e["occurrences"], e["scientificName"]))
    excluded.sort(key=lambda e: (-e["occurrences"], e["scientificName"]))
    return {"included": included, "excluded": excluded}


def catalogue_summary(catalogue: dict) -> dict:
    """Species counts *and* observation share.

    Species share alone badly misrepresents the filter: it drops ~43% of Sweden's species while
    those carry 0.37% of all observations. Only the second number shows that almost nothing a person
    could actually meet is being lost.
    """
    inc = sum(e["occurrences"] for e in catalogue["included"])
    exc = sum(e["occurrences"] for e in catalogue["excluded"])
    total = inc + exc
    return {
        "includedSpecies": len(catalogue["included"]),
        "excludedSpecies": len(catalogue["excluded"]),
        "includedObservations": inc,
        "excludedObservations": exc,
        "includedObservationPct": round(100 * inc / total, 2) if total else 0.0,
    }
