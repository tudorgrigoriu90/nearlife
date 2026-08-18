"""Collapse an apomictic genus into the one card people mean (T-163).

GBIF splits *Taraxacum officinale* into hundreds of microspecies; Sweden's data holds **216** of
them, carrying 89,286 observations. Left alone the app either offers `Taraxacum piceatum` as
something to spot, or shows a dandelion with a sliver of its real presence. Neither is what anyone
means by *maskros*.

Deliberately **configured**, never automatic: collapsing any genus with many members would be a lie
in the other direction, since most genera hold genuinely distinct species a person can tell apart.
Only genera listed here are merged, and each names the binomial the merge collapses onto.
"""

from collections import defaultdict

# genus → the binomial its microspecies collapse into.
GENUS_AGGREGATES: dict[str, str] = {
    "Taraxacum": "Taraxacum officinale",
}


def aggregate_genus(records: list[dict], aggregates: dict[str, str] = GENUS_AGGREGATES) -> list[dict]:
    """Merge configured genera per county, summing occurrences and unioning active months.

    A genus whose target binomial is absent from the data is left untouched: the target's
    `speciesKey` is the app's species id, and borrowing a microspecies' key would produce an id that
    renames itself whenever the ingest reorders — or points at a species nobody meant.
    """
    if not aggregates:
        return records

    # Only merge onto a target we actually have a key for.
    target_keys: dict[str, int] = {}
    for r in records:
        for genus, target in aggregates.items():
            if r["scientificName"] == target:
                target_keys[genus] = r["speciesKey"]

    def genus_of(name: str) -> str | None:
        head = name.split(" ", 1)[0]
        return head if head in aggregates and head in target_keys else None

    merged: dict[tuple[str, str], dict] = {}
    passthrough: list[dict] = []
    for r in records:
        genus = genus_of(r["scientificName"])
        if genus is None:
            passthrough.append(r)
            continue
        key = (r["county"], genus)
        entry = merged.get(key)
        if entry is None:
            merged[key] = {
                **r,
                "speciesKey": target_keys[genus],
                "scientificName": aggregates[genus],
                "activeMonths": sorted(set(r["activeMonths"])),
                "occurrences": r["occurrences"],
            }
        else:
            entry["occurrences"] += r["occurrences"]
            entry["activeMonths"] = sorted(set(entry["activeMonths"]) | set(r["activeMonths"]))

    out = passthrough + list(merged.values())
    out.sort(key=lambda r: (r["county"], -r["occurrences"], r["scientificName"]))
    return out
