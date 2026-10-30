"""T-046/T-049: which OpenStreetMap features become catch spots, their habitat, and what excludes
them. Pure rules; the network side is pipeline/osm/overpass.py."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from osm.counties import ISO_BY_GADM  # noqa: E402
from osm.rules import (  # noqa: E402
    SURFACED,
    habitat_of,
    kind_of,
    spot_from_element,
    tag_flags,
)


def test_designated_public_places_are_spots():
    assert kind_of({"tourism": "viewpoint"}) == "viewpoint"
    assert kind_of({"leisure": "picnic_site"}) == "picnic_site"
    assert kind_of({"tourism": "picnic_site"}) == "picnic_site"
    assert kind_of({"amenity": "shelter", "shelter_type": "lean_to"}) == "shelter"
    assert kind_of({"leisure": "bird_hide"}) == "bird_hide"
    assert kind_of({"natural": "beach"}) == "beach"
    assert kind_of({"leisure": "fishing"}) == "fishing"


def test_a_bus_shelter_is_not_nature():
    assert kind_of({"amenity": "shelter", "shelter_type": "public_transport"}) is None
    assert kind_of({"amenity": "bench"}) is None


def test_water_edge_places_are_freshwater_unless_by_the_sea():
    assert habitat_of("beach", near_coast=False) == "freshwater"
    assert habitat_of("beach", near_coast=True) == "coast"
    assert habitat_of("fishing", near_coast=True) == "coast"
    assert habitat_of("viewpoint", near_coast=True) == "land"
    assert habitat_of("picnic_site", near_coast=False) == "land"


def test_tags_that_exclude_a_spot():
    assert tag_flags({"access": "private"}) == ["private"]
    assert tag_flags({"access": "no"}) == ["private"]
    assert tag_flags({"access": "yes"}) == []
    assert tag_flags({"leisure": "fishing", "man_made": "pier"}) == ["water"]
    assert tag_flags({"natural": "beach"}) == []


def test_every_exclusion_class_is_never_surfaced():
    # TSD §5: private, roads/rail, water hazards, protected reserves, restricted (military) land.
    for flag in ("private", "major_road", "water", "reserve", "military"):
        assert not SURFACED([flag])
    assert SURFACED([])


def test_elements_become_spots_with_a_stable_id_and_a_point():
    node = {"type": "node", "id": 42, "lat": 56.88, "lon": 14.81, "tags": {"tourism": "viewpoint"}}
    way = {"type": "way", "id": 7, "center": {"lat": 56.9, "lon": 14.7}, "tags": {"leisure": "park"}}
    assert spot_from_element(node) == {
        "id": "n42", "lat": 56.88, "lon": 14.81, "kind": "viewpoint", "name": None, "tags_flags": [],
    }
    assert spot_from_element(way)["id"] == "w7"
    assert spot_from_element({"type": "way", "id": 8, "tags": {"leisure": "park"}}) is None  # no centre
    assert spot_from_element({"type": "node", "id": 9, "lat": 1, "lon": 2, "tags": {"amenity": "bench"}}) is None


def test_all_21_counties_map_to_their_iso_code():
    assert len(ISO_BY_GADM) == 21
    assert ISO_BY_GADM["SWE.9_1"] == "SE-G"
    assert ISO_BY_GADM["SWE.13_1"] == "SE-M"
    assert ISO_BY_GADM["SWE.15_1"] == "SE-AB"
    assert len(set(ISO_BY_GADM.values())) == 21


def test_a_county_is_assembled_with_habitat_and_every_flag():
    from osm.spots import county_spots, summary

    result = {
        "elements": [
            {"type": "node", "id": 1, "lat": 56.0, "lon": 14.0, "tags": {"natural": "beach"}},
            {"type": "node", "id": 2, "lat": 56.1, "lon": 14.1, "tags": {"tourism": "viewpoint"}},
            {"type": "node", "id": 3, "lat": 56.2, "lon": 14.2, "tags": {"leisure": "bird_hide"}},
            {"type": "node", "id": 4, "lat": 56.3, "lon": 14.3, "tags": {"leisure": "picnic_site", "access": "private"}},
            {"type": "node", "id": 2, "lat": 56.1, "lon": 14.1, "tags": {"tourism": "viewpoint"}},  # duplicate
        ]
    }
    spots = county_spots("SWE.9_1", result, near_coast={"n1"}, in_reserve={"n3"}, in_military=set(), near_road={"n2"})
    by_id = {s["id"]: s for s in spots}
    assert len(spots) == 4
    assert by_id["n1"]["habitat"] == "coast" and by_id["n1"]["flags"] == []
    assert by_id["n2"]["flags"] == ["major_road"]
    assert by_id["n3"]["flags"] == ["reserve"] and by_id["n3"]["habitat"] == "freshwater"
    assert by_id["n4"]["flags"] == ["private"]
    assert summary(spots) == {
        "total": 4,
        "shown": 1,
        "excluded_by_flag": {"major_road": 1, "reserve": 1, "private": 1},
        "shown_by_habitat": {"coast": 1},
    }
