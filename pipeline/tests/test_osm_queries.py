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
