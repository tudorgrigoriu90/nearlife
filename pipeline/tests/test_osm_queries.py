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
    near_coast_query,
    near_roads_query,
    spots_query,
)


def test_spots_are_asked_for_one_county_by_its_iso_code():
    q = spots_query("SE-G")
    assert 'area["ISO3166-2"="SE-G"]' in q
    assert '"tourism"="viewpoint"' in q and '"leisure"="bird_hide"' in q
    assert "out tags center;" in q


def test_flag_queries_return_ids_only():
    for q in (near_coast_query("SE-G"), near_roads_query("SE-G"), inside_query("SE-G", RESERVE_FILTERS)):
        assert q.rstrip().endswith("out ids;")


def test_the_exclusion_zones_cover_reserves_parks_and_military_land():
    reserves = inside_query("SE-G", RESERVE_FILTERS)
    assert '"leisure"="nature_reserve"' in reserves and '"boundary"="national_park"' in reserves
    assert '"landuse"="military"' in inside_query("SE-G", MILITARY_FILTERS)


def test_major_roads_and_railways_only():
    q = near_roads_query("SE-G")
    assert "motorway|trunk|primary" in q and '"railway"="rail"' in q
    assert "residential" not in q  # quiet streets near a park are not a hazard


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
        assert str(exc).startswith("near coast:")
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
    for q in (spots_query("SE-AB"), near_coast_query("SE-AB"), near_roads_query("SE-AB"),
              inside_query("SE-AB", RESERVE_FILTERS)):
        assert "maxsize" not in q


def test_coast_and_roads_are_searched_near_spots_not_across_the_county():
    # County-wide road and coastline sets timed out for Stockholm and Skåne (2026-10-30).
    roads, coast = near_roads_query("SE-AB"), near_coast_query("SE-AB")
    assert '(around.p:' in roads and '"highway"' in roads and '](area.c);\n  way["railway"' not in roads
    assert '"railway"="rail"](around.p:' in roads
    assert '"natural"="coastline"](around.p:' in coast and '"coastline"](area.c)' not in coast
