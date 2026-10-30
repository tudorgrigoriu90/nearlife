"""Assemble one county's catch spots from the Overpass results (T-046 · T-049). Pure."""

from .rules import habitat_of, spot_from_element


def county_spots(
    region_id: str,
    spot_result: dict,
    near_coast: set[str],
    in_reserve: set[str],
    in_military: set[str],
    near_road: set[str],
) -> list[dict]:
    spots: dict[str, dict] = {}
    for el in spot_result.get("elements", []):
        spot = spot_from_element(el)
        if spot is None or spot["id"] in spots:
            continue
        sid = spot["id"]
        flags = list(spot.pop("tags_flags"))
        flags += [f for f, ids in (("reserve", in_reserve), ("military", in_military), ("major_road", near_road)) if sid in ids]
        spot.update(region_id=region_id, habitat=habitat_of(spot["kind"], sid in near_coast), flags=sorted(set(flags)))
        spots[sid] = spot
    return sorted(spots.values(), key=lambda s: s["id"])


def summary(spots: list[dict]) -> dict:
    """Counts the run log prints and the density audit (T-050) starts from."""
    shown = [s for s in spots if not s["flags"]]
    by_flag: dict[str, int] = {}
    for s in spots:
        for f in s["flags"]:
            by_flag[f] = by_flag.get(f, 0) + 1
    by_habitat: dict[str, int] = {}
    for s in shown:
        by_habitat[s["habitat"]] = by_habitat.get(s["habitat"], 0) + 1
    return {"total": len(spots), "shown": len(shown), "excluded_by_flag": by_flag, "shown_by_habitat": by_habitat}
