"""Which spots lie within a radius of a line: a major road, a railway, the coastline (T-049).
Pure, so the safety rule is tested here rather than trusted to a remote server.

The first version asked Overpass to do this with `around`. Searched across a county it timed out
in the largest ones. Searched from each spot, it returned empty sets for counties that certainly
have spots by motorways (2026-10-31), and the cause could not be seen from outside. So the
pipeline now downloads the line geometry inside the spots' bounding box (the cheapest query
Overpass has) and measures here.

Distances use a local flat projection centred on each spot: at 30–300 m the error is far below a
metre, even at 69°N. A grid of cells one radius wide keeps it near-linear in the number of
segments.
"""

import math
from collections import defaultdict

M_PER_DEG_LAT = 111_320.0

LatLon = tuple[float, float]


def lines_from(result: dict) -> list[list[LatLon]]:
    """Ways from an Overpass `out geom` answer, as lists of (lat, lon). Single points are dropped."""
    lines = []
    for el in result.get("elements", []):
        geom = el.get("geometry") or []
        pts = [(float(g["lat"]), float(g["lon"])) for g in geom if "lat" in g and "lon" in g]
        if el.get("type") == "way" and len(pts) >= 2:
            lines.append(pts)
    return lines


def bbox_around(points: dict[str, LatLon], radius_m: float) -> tuple[float, float, float, float]:
    """(south, west, north, east) covering every point plus the radius, for the line download."""
    lats = [p[0] for p in points.values()]
    lons = [p[1] for p in points.values()]
    dlat = radius_m / M_PER_DEG_LAT * 1.5
    widest = math.cos(math.radians(max(abs(min(lats)), abs(max(lats)))))
    dlon = radius_m / (M_PER_DEG_LAT * widest) * 1.5
    return (min(lats) - dlat, min(lons) - dlon, max(lats) + dlat, max(lons) + dlon)


def _segment_distance_m(p: LatLon, a: LatLon, b: LatLon) -> float:
    k = math.cos(math.radians(p[0]))
    ax, ay = (a[1] - p[1]) * k * M_PER_DEG_LAT, (a[0] - p[0]) * M_PER_DEG_LAT
    bx, by = (b[1] - p[1]) * k * M_PER_DEG_LAT, (b[0] - p[0]) * M_PER_DEG_LAT
    dx, dy = bx - ax, by - ay
    length2 = dx * dx + dy * dy
    t = 0.0 if length2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / length2))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(cx, cy)


def points_near_lines(points: dict[str, LatLon], lines: list[list[LatLon]], radius_m: float) -> set[str]:
    if not points or not lines:
        return set()
    all_lats = [p[0] for p in points.values()] + [v[0] for line in lines for v in line]
    # Cells sized for the narrowest longitude degree in the data, so a cell is never smaller than
    # the radius anywhere: a point's neighbours are always within its own and the 8 cells around.
    cos_min = math.cos(math.radians(max(abs(x) for x in all_lats)))
    cell_lat = radius_m / M_PER_DEG_LAT
    cell_lon = radius_m / (M_PER_DEG_LAT * cos_min)

    def cell(lat: float, lon: float) -> tuple[int, int]:
        return (math.floor(lat / cell_lat), math.floor(lon / cell_lon))

    grid: dict[tuple[int, int], list[tuple[LatLon, LatLon]]] = defaultdict(list)
    for line in lines:
        for a, b in zip(line, line[1:]):
            (i0, j0), (i1, j1) = cell(min(a[0], b[0]), min(a[1], b[1])), cell(max(a[0], b[0]), max(a[1], b[1]))
            for i in range(i0, i1 + 1):
                for j in range(j0, j1 + 1):
                    grid[(i, j)].append((a, b))

    near = set()
    for pid, p in points.items():
        ci, cj = cell(*p)
        found = False
        for i in (ci - 1, ci, ci + 1):
            for j in (cj - 1, cj, cj + 1):
                for a, b in grid.get((i, j), ()):
                    if _segment_distance_m(p, a, b) <= radius_m:
                        found = True
                        break
                if found:
                    break
            if found:
                break
        if found:
            near.add(pid)
    return near
