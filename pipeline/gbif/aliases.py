"""Merged species stay merged across GBIF ingests (T-373).

`public.merge_species` folds a duplicate key into GBIF's accepted one and records it in
`public.species_aliases`. GBIF still serves records under both keys, so each ingest would split
them again; the loader applies the aliases first: the alias never re-enters the catalogue, and its
records add to the accepted species' (they are different occurrences, so they sum).
"""


def _sum_counts(a: list | None, b: list | None) -> list | None:
    if a is None:
        return b
    if b is None:
        return a
    return [x + y for x, y in zip(a, b)]


def apply_aliases(species_rows: list[dict], presence_rows: list[dict], aliases: dict[str, str]):
    if not aliases:
        return species_rows, presence_rows
    alias_listed = {s["id"]: s.get("in_catalogue", False) for s in species_rows if s["id"] in aliases}
    for s in species_rows:
        if s["id"] in aliases:
            s["in_catalogue"] = False
    for s in species_rows:
        if any(aliases[a] == s["id"] and listed for a, listed in alias_listed.items()):
            s["in_catalogue"] = True

    merged: dict[tuple[str, str], dict] = {}
    order: list[tuple[str, str]] = []
    for p in presence_rows:
        sid = aliases.get(p["species_id"], p["species_id"])
        key = (p["region_id"], sid)
        if key not in merged:
            merged[key] = {**p, "species_id": sid}
            order.append(key)
            continue
        m = merged[key]
        m["occurrences"] = m["occurrences"] + p["occurrences"]
        m["month_counts"] = _sum_counts(m.get("month_counts"), p.get("month_counts"))
        m["active_months"] = sorted(set(m["active_months"]) | set(p["active_months"]))
    return species_rows, [merged[k] for k in order]
