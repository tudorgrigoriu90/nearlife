"""Overpass API client and the queries behind catch spots (T-046 · T-049). Network I/O only; what a
result means lives in osm/rules.py.

One county per query, selected by its boundary's ISO 3166-2 tag. Five queries per county: the
spots themselves, then the ids of spots near the coast, inside protected or military land, and near
major roads. Overpass is a shared community service, so the client paces itself and backs off on
429/502/503/504. The whole country is about 105 queries, run yearly from CI.

A busy answer moves the next attempt to the other public instance: in the first full run
(2026-10-30) the main server answered Norrbotten's queries with six 502s in a row, and retrying the
same server only lost the county. Both instances serve the same OSM data.
"""

import time

import requests

from .rules import COAST_RADIUS_M, KINDS, ROAD_RADIUS_M

ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
TIMEOUT_S = 900
# Default memory cap on purpose. Asking for 2 GB (2026-10-30) got even small Kronoberg turned
# away with 504s: a busy server will not admit a query that big. The road and coast queries are
# instead built to stay small (below).
HEADER = f"[out:json][timeout:{TIMEOUT_S}];"


def _county(iso: str) -> str:
    return f'area["ISO3166-2"="{iso}"]["boundary"="administrative"]->.c;'


def _spots_set() -> str:
    lines = [f'  nwr["{k}"="{v}"](area.c);' for k, v, _ in KINDS]
    return "(\n" + "\n".join(lines) + "\n)->.p;"


def spots_query(iso: str) -> str:
    return f"{HEADER}\n{_county(iso)}\n{_spots_set()}\n.p out tags center;"


# The coast and road queries start from the spots, not the county. Collecting every motorway and
# every coastline way in Stockholm or Skåne first is what timed out in the first full run. Looking
# only within the radius of a spot touches a few hundred ways, and the answer is the same: a spot
# is near a road exactly when a road is near the spot. It also catches a coastline just outside
# the county boundary, which the county-wide version missed.
def near_coast_query(iso: str) -> str:
    return (
        f"{HEADER}\n{_county(iso)}\n{_spots_set()}\n"
        f'way["natural"="coastline"](around.p:{COAST_RADIUS_M})->.coast;\n'
        f"nwr.p(around.coast:{COAST_RADIUS_M});\nout ids;"
    )


def inside_query(iso: str, area_filters: list[str]) -> str:
    """Spots inside any area matching the filters (protected land, military land)."""
    parts = "\n".join(f"  way{f}(area.c);\n  relation{f}(area.c);" for f in area_filters)
    return (
        f"{HEADER}\n{_county(iso)}\n{_spots_set()}\n"
        f"(\n{parts}\n)->.zones;\n.zones map_to_area->.za;\nnwr.p(area.za);\nout ids;"
    )


RESERVE_FILTERS = ['["leisure"="nature_reserve"]', '["boundary"="protected_area"]', '["boundary"="national_park"]']
MILITARY_FILTERS = ['["landuse"="military"]', '["military"]']


def near_roads_query(iso: str) -> str:
    return (
        f"{HEADER}\n{_county(iso)}\n{_spots_set()}\n"
        f'(\n  way["highway"~"^(motorway|trunk|primary|motorway_link|trunk_link)$"](around.p:{ROAD_RADIUS_M});\n'
        f'  way["railway"="rail"](around.p:{ROAD_RADIUS_M});\n)->.roads;\n'
        f"nwr.p(around.roads:{ROAD_RADIUS_M});\nout ids;"
    )


def ids_from(result: dict) -> set[str]:
    return {f"{el['type'][0]}{el['id']}" for el in result.get("elements", [])}


class OverpassClient:
    def __init__(
        self,
        endpoints: list[str] | None = None,
        pause: float = 5.0,
        backoff: float = 30.0,
        max_retries: int = 8,
    ):
        self.endpoints = endpoints or ENDPOINTS
        self.pause = pause
        self.backoff = backoff
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "nearby-nearlife-pipeline/0.1 (catch spots; yearly)"})

    def run(self, query: str) -> dict:
        delay = self.backoff
        failure = "no attempt made"
        for attempt in range(self.max_retries):
            endpoint = self.endpoints[attempt % len(self.endpoints)]
            try:
                resp = self.session.post(endpoint, data={"data": query}, timeout=TIMEOUT_S + 60)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
                # A busy server also drops connections outright (Kronoberg, 2026-10-30): same as a 504.
                resp = None
                failure = f"{exc} ({endpoint})"
            if resp is not None and resp.status_code in (429, 502, 503, 504):
                failure = f"{resp.status_code} from {endpoint}"
            elif resp is not None:
                resp.raise_for_status()
                body = resp.json()
                # A timeout or out-of-memory comes back as HTTP 200 with no elements and a
                # "runtime error" remark. Read as an empty answer, it silently dropped every
                # road and coast flag in the largest counties (2026-10-30). It is a failure.
                remark = body.get("remark") or ""
                if "runtime error" not in remark.lower():
                    time.sleep(self.pause)
                    return body
                failure = f"{remark} ({endpoint})"
            if attempt + 1 < self.max_retries:
                time.sleep(delay)  # the shared server is busy: wait, never hammer
                delay = min(delay * 2, 300.0)
        raise RuntimeError(failure)
