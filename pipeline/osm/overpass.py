"""Overpass API client and the queries behind catch spots (T-046 · T-049). Network I/O only; what a
result means lives in osm/rules.py.

One county per query, selected by its boundary's ISO 3166-2 tag. Five queries per county: the
spots themselves; the ids of spots inside protected or military land; and the geometry of the major
roads and railways, and of the coastline, in the spots' bounding box (distances measured locally). Overpass is a shared community service, so the client paces itself and backs off on
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


ROAD_FILTERS = ['["highway"~"^(motorway|trunk|primary|motorway_link|trunk_link)$"]', '["railway"="rail"]']
COAST_FILTERS = ['["natural"="coastline"]']


def lines_query(filters: list[str], bbox: tuple[float, float, float, float]) -> str:
    """Line geometry inside a box. Distances are measured locally (osm/proximity.py): a bounding-box
    download is the cheapest query Overpass serves, and it gives the same answer on every
    instance."""
    s, w, n, e = (round(v, 5) for v in bbox)
    parts = "\n".join(f"  way{f}({s},{w},{n},{e});" for f in filters)
    return f"{HEADER}\n(\n{parts}\n);\nout geom;"


def inside_query(iso: str, area_filters: list[str]) -> str:
    """Spots inside any area matching the filters (protected land, military land)."""
    parts = "\n".join(f"  way{f}(area.c);\n  relation{f}(area.c);" for f in area_filters)
    return (
        f"{HEADER}\n{_county(iso)}\n{_spots_set()}\n"
        f"(\n{parts}\n)->.zones;\n.zones map_to_area->.za;\nnwr.p(area.za);\nout ids;"
    )


RESERVE_FILTERS = ['["leisure"="nature_reserve"]', '["boundary"="protected_area"]', '["boundary"="national_park"]']
MILITARY_FILTERS = ['["landuse"="military"]', '["military"]']


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
