"""Which OpenStreetMap features become catch spots, what habitat they serve, and what excludes them
(T-046 · T-049 · TSD §5).

Spots are DESIGNATED PUBLIC PLACES only: viewpoints, picnic sites, wilderness shelters, parks,
trailheads, bird hides, beaches, bathing places, fishing spots. A random point inside a forest
polygon could be someone's garden or a field in crop; a picnic site is somewhere people are meant
to go. That gives fewer spots than a habitat-polygon approach, which T-050's density audit
measures, and a much stronger safety story.

Habitat is deliberately coarse in v1: LAND, FRESHWATER or COAST, matched to each species' GBIF
realm (T-191). A fish needs a water-edge spot and a marine fish a coastal one; a bird, insect,
plant or mammal can be met at any land spot. Forest and meadow are not told apart. That would
need a point-in-polygon join over millions of habitat polygons, and the realm split already
covers the case that matters most: never send someone to a picnic table to catch a pike.

A spot with any exclusion flag is never surfaced. The flags are private access, a major road or
railway within 30 m, in or over water, inside a protected area or nature reserve, or inside
military land.
"""

# (key, value) → spot kind. Order matters only for features carrying several of these tags.
KINDS: list[tuple[str, str, str]] = [
    ("leisure", "bird_hide", "bird_hide"),
    ("leisure", "fishing", "fishing"),
    ("leisure", "bathing_place", "bathing_place"),
    ("natural", "beach", "beach"),
    ("tourism", "viewpoint", "viewpoint"),
    ("tourism", "picnic_site", "picnic_site"),
    ("leisure", "picnic_site", "picnic_site"),
    ("amenity", "shelter", "shelter"),
    ("highway", "trailhead", "trailhead"),
    ("leisure", "park", "park"),
]

# Kinds at the water's edge: they serve freshwater species, or coastal ones near the sea.
WATER_EDGE = {"bird_hide", "fishing", "bathing_place", "beach"}

# How near the coastline a water-edge spot must be to count as coastal (metres).
COAST_RADIUS_M = 300
# Spots this close to a major road or railway are excluded (metres).
ROAD_RADIUS_M = 30

PRIVATE_ACCESS = {"private", "no"}
IN_WATER = {"pier", "breakwater", "groyne", "jetty"}


def kind_of(tags: dict) -> str | None:
    if tags.get("amenity") == "shelter" and tags.get("shelter_type") == "public_transport":
        return None  # a bus stop is not a place in nature
    for key, value, kind in KINDS:
        if tags.get(key) == value:
            return kind
    return None


def habitat_of(kind: str, near_coast: bool) -> str:
    if kind in WATER_EDGE:
        return "coast" if near_coast else "freshwater"
    return "land"


def tag_flags(tags: dict) -> list[str]:
    """Exclusions readable from a feature's own tags; the spatial ones come from Overpass."""
    flags = []
    if tags.get("access") in PRIVATE_ACCESS:
        flags.append("private")
    if tags.get("man_made") in IN_WATER or tags.get("natural") == "water":
        flags.append("water")
    return flags


def SURFACED(flags: list[str]) -> bool:  # noqa: N802 - reads as a rule name at the call site
    """A spot is shown only with no exclusion flag at all."""
    return len(flags) == 0


def spot_from_element(el: dict) -> dict | None:
    """An Overpass element (`out tags center`) → a spot, or None if it isn't one."""
    tags = el.get("tags") or {}
    kind = kind_of(tags)
    if kind is None:
        return None
    if el.get("type") == "node":
        lat, lon = el.get("lat"), el.get("lon")
    else:
        center = el.get("center") or {}
        lat, lon = center.get("lat"), center.get("lon")
    if lat is None or lon is None:
        return None
    return {
        "id": f"{el['type'][0]}{el['id']}",
        "lat": round(float(lat), 6),
        "lon": round(float(lon), 6),
        "kind": kind,
        "name": tags.get("name"),
        "tags_flags": tag_flags(tags),
    }
