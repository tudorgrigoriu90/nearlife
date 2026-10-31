"""T-046: the Overpass queries ask for the right things in the right county. The live runs happen in
CI (catch-spots.yml); these pin the query text so a refactor cannot quietly widen or drop a rule."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from osm.overpass import (  # noqa: E402
    MILITARY_FILTERS,
    RESERVE_FILTERS,
    ids_from,
    inside_query,
    COAST_FILTERS,
    ROAD_FILTERS,
    lines_query,
    spots_query,
)


def test_spots_are_asked_for_one_county_by_its_iso_code():
    q = spots_query("SE-G")
    assert 'area["ISO3166-2"="SE-G"]' in q
    assert '"tourism"="viewpoint"' in q and '"leisure"="bird_hide"' in q
    assert "out tags center;" in q


def test_flag_queries_return_ids_only():
    for q in (inside_query("SE-G", RESERVE_FILTERS), inside_query("SE-G", MILITARY_FILTERS)):
        assert q.rstrip().endswith("out ids;")


def test_the_exclusion_zones_cover_reserves_parks_and_military_land():
    reserves = inside_query("SE-G", RESERVE_FILTERS)
    assert '"leisure"="nature_reserve"' in reserves and '"boundary"="national_park"' in reserves
    assert '"landuse"="military"' in inside_query("SE-G", MILITARY_FILTERS)


def test_major_roads_and_railways_only():
    q = lines_query(ROAD_FILTERS, (59.0, 18.0, 59.5, 18.5))
    assert "motorway|trunk|primary" in q and '"railway"="rail"' in q
    assert "residential" not in q  # quiet streets near a park are not a hazard


def test_line_downloads_are_plain_bounding_box_queries_with_geometry():
    q = lines_query(COAST_FILTERS, (59.0, 18.0, 59.5, 18.5))
    assert 'way["natural"="coastline"](59.0,18.0,59.5,18.5);' in q
    assert q.rstrip().endswith("out geom;")
    assert "around" not in q and "area" not in q


def test_ids_match_the_spot_id_format():
    assert ids_from({"elements": [{"type": "node", "id": 1}, {"type": "way", "id": 2}]}) == {"n1", "w2"}


class _Resp:
    def __init__(self, status, body=None):
        self.status_code = status
        self._body = body or {"elements": []}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"{self.status_code} Server Error")

    def json(self):
        return self._body


class _Session:
    def __init__(self, statuses):
        self.statuses = list(statuses)
        self.urls = []
        self.headers = {}

    def post(self, url, data, timeout):
        self.urls.append(url)
        return _Resp(self.statuses.pop(0))


def _client(statuses, endpoints=("https://a/api", "https://b/api")):
    from osm.overpass import OverpassClient

    client = OverpassClient(endpoints=list(endpoints), pause=0, backoff=0, max_retries=4)
    client.session = _Session(statuses)
    return client


def test_a_busy_server_moves_the_next_attempt_to_the_other_endpoint():
    # Norrbotten (2026-10-30): six 502s in a row from one server lost the county.
    client = _client([502, 200])
    assert client.run("q") == {"elements": []}
    assert client.session.urls == ["https://a/api", "https://b/api"]


def test_endpoints_alternate_and_give_up_after_max_retries():
    client = _client([504, 502, 429, 503])
    try:
        client.run("q")
    except RuntimeError as exc:
        assert "503" in str(exc)
    else:
        raise AssertionError("expected the last error to surface")
    assert client.session.urls == ["https://a/api", "https://b/api", "https://a/api", "https://b/api"]


def test_a_failed_county_names_the_query_that_failed():
    import build_catch_spots

    client = _client([200, 502, 502, 502, 502])
    try:
        build_catch_spots.build_county(client, "SWE.9_1", "SE-G")
    except RuntimeError as exc:
        # The fake answers the spots query with no elements, which is itself a failure now.
        assert str(exc).startswith("spots:")
    else:
        raise AssertionError("expected a failure")


class _BodySession(_Session):
    def __init__(self, bodies):
        super().__init__([200] * len(bodies))
        self.bodies = list(bodies)

    def post(self, url, data, timeout):
        self.urls.append(url)
        self.statuses.pop(0)
        return _Resp(200, self.bodies.pop(0))


TIMEOUT_REMARK = {
    "elements": [],
    "remark": 'runtime error: Query timed out in "query" at line 4 after 901 seconds.',
}


def test_a_timed_out_query_is_an_error_not_an_empty_answer():
    # 2026-10-30: Overpass answers a timeout with HTTP 200, no elements and a remark. Read as
    # "nothing found", it left every spot near a motorway unflagged in Stockholm and Skåne.
    from osm.overpass import OverpassClient

    client = OverpassClient(endpoints=["https://a/api", "https://b/api"], pause=0, backoff=0, max_retries=2)
    client.session = _BodySession([TIMEOUT_REMARK, TIMEOUT_REMARK])
    try:
        client.run("q")
    except RuntimeError as exc:
        assert "timed out" in str(exc)
    else:
        raise AssertionError("a runtime error must not pass as an empty result")
    assert client.session.urls == ["https://a/api", "https://b/api"]  # retried on the other server


def test_a_runtime_error_on_one_server_can_succeed_on_the_other():
    from osm.overpass import OverpassClient

    client = OverpassClient(endpoints=["https://a/api", "https://b/api"], pause=0, backoff=0, max_retries=2)
    client.session = _BodySession([TIMEOUT_REMARK, {"elements": [{"type": "node", "id": 1}]}])
    assert client.run("q")["elements"] == [{"type": "node", "id": 1}]


def test_a_harmless_remark_is_not_an_error():
    from osm.overpass import OverpassClient

    client = OverpassClient(endpoints=["https://a/api"], pause=0, backoff=0, max_retries=1)
    client.session = _BodySession([{"elements": [], "remark": "Note: nothing changed"}])
    assert client.run("q") == {"elements": [], "remark": "Note: nothing changed"}


def test_no_query_asks_for_more_than_the_default_memory():
    # A 2 GB request got queries turned away with 504s by a busy server, even for small counties.
    box = (59.0, 18.0, 59.5, 18.5)
    for q in (spots_query("SE-AB"), lines_query(ROAD_FILTERS, box), lines_query(COAST_FILTERS, box),
              inside_query("SE-AB", RESERVE_FILTERS)):
        assert "maxsize" not in q


class _FlakySession(_Session):
    """Drops the connection for the first `drops` attempts, then answers."""

    def __init__(self, drops):
        super().__init__([200])
        self.drops = drops

    def post(self, url, data, timeout):
        import requests

        self.urls.append(url)
        if self.drops > 0:
            self.drops -= 1
            raise requests.exceptions.ConnectionError("Remote end closed connection without response")
        return _Resp(200, {"elements": [{"type": "way", "id": 7}]})


def test_a_dropped_connection_is_retried_on_the_other_server():
    # 2026-10-30: Kronoberg and Halland were lost to a single "Connection aborted".
    from osm.overpass import OverpassClient

    client = OverpassClient(endpoints=["https://a/api", "https://b/api"], pause=0, backoff=0, max_retries=3)
    client.session = _FlakySession(drops=2)
    assert client.run("q")["elements"] == [{"type": "way", "id": 7}]
    assert client.session.urls == ["https://a/api", "https://b/api", "https://a/api"]


def test_dropped_connections_that_never_recover_fail_with_the_reason():
    from osm.overpass import OverpassClient

    client = OverpassClient(endpoints=["https://a/api"], pause=0, backoff=0, max_retries=2)
    client.session = _FlakySession(drops=5)
    try:
        client.run("q")
    except RuntimeError as exc:
        assert "Remote end closed" in str(exc)
    else:
        raise AssertionError("expected the failure to surface")


def test_a_county_build_flags_a_spot_beside_a_motorway_and_marks_a_beach_coastal():
    # End to end through build_county with canned Overpass answers, in query order:
    # spots, roads, coastline, reserves, military.
    import build_catch_spots
    from osm.overpass import OverpassClient

    spots = {"elements": [
        {"type": "node", "id": 1, "lat": 59.0002, "lon": 18.005, "tags": {"tourism": "picnic_site"}},
        {"type": "node", "id": 2, "lat": 59.0100, "lon": 18.005, "tags": {"tourism": "picnic_site"}},
        {"type": "node", "id": 3, "lat": 59.0300, "lon": 18.005, "tags": {"natural": "beach"}},
    ]}
    motorway = {"elements": [{"type": "way", "id": 10, "geometry": [{"lat": 59.0, "lon": 18.0}, {"lat": 59.0, "lon": 18.01}]}]}
    coastline = {"elements": [{"type": "way", "id": 20, "geometry": [{"lat": 59.031, "lon": 18.0}, {"lat": 59.031, "lon": 18.01}]}]}
    client = OverpassClient(endpoints=["https://a/api"], pause=0, backoff=0, max_retries=1)
    client.session = _BodySession([spots, motorway, coastline, {"elements": []}, {"elements": []}])

    built = {s["id"]: s for s in build_catch_spots.build_county(client, "SWE.15_1", "SE-AB")}
    assert built["n1"]["flags"] == ["major_road"]  # ~22 m from the motorway
    assert built["n2"]["flags"] == []  # ~1.1 km away
    assert built["n3"]["habitat"] == "coast"  # ~110 m from the coastline
