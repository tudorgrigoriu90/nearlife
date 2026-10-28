"""County outlines for on-device hometown resolution (T-090)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.counties import SWEDISH_COUNTIES  # noqa: E402
from geo.county_shapes import (  # noqa: E402
    county_shapes,
    fold,
    gid_for,
    round_ring,
    to_typescript,
)

# Natural Earth's own spellings for all 21 counties (v5.1.2 `name`), including the one that differs
# from GADM's ("Orebro"). The join must take every one of them to a distinct GADM id.
NATURAL_EARTH_NAMES = [
    "Norrbotten", "Västerbotten", "Jämtland", "Dalarna", "Värmland", "Västra Götaland",
    "Västernorrland", "Gävleborg", "Uppsala", "Stockholm", "Södermanland", "Östergötland",
    "Kalmar", "Blekinge", "Skåne", "Halland", "Gotland", "Västmanland", "Jönköping", "Orebro",
    "Kronoberg",
]


def square(x0, y0, size=1.0):
    return [[x0, y0], [x0 + size, y0], [x0 + size, y0 + size], [x0, y0 + size], [x0, y0]]


def feature(name, coords, kind="Polygon"):
    return {"properties": {"adm0_a3": "SWE", "name": name}, "geometry": {"type": kind, "coordinates": coords}}


def collection(features):
    other = {"properties": {"adm0_a3": "NOR", "name": "Oslo"}, "geometry": {"type": "Polygon", "coordinates": [square(10, 59)]}}
    return {"features": [other, *features]}


def all_counties():
    return collection([feature(n, [square(i, 55)]) for i, n in enumerate(NATURAL_EARTH_NAMES)])


def test_fold_ignores_case_and_diacritics():
    assert fold("Örebro") == fold("orebro") == "orebro"
    assert fold("Skåne") == "skane"


def test_every_natural_earth_name_joins_to_a_distinct_gadm_id():
    gids = [gid_for(feature(n, [square(0, 0)])) for n in NATURAL_EARTH_NAMES]
    assert sorted(gids) == sorted(c["gid"] for c in SWEDISH_COUNTIES)
    assert gid_for(feature("Orebro", [])) == "SWE.11_1"
    assert gid_for(feature("Kronoberg", [])) == "SWE.9_1"


def test_an_unknown_name_fails_loudly_rather_than_landing_somewhere():
    with pytest.raises(ValueError, match="matches no GADM county"):
        gid_for(feature("Lappland", []))


def test_round_ring_rounds_and_drops_the_duplicates_rounding_creates():
    ring = [[14.80001, 56.88001], [14.80004, 56.88004], [14.9, 56.9], [14.80001, 56.88001]]
    assert round_ring(ring) == [[14.8, 56.88], [14.9, 56.9], [14.8, 56.88]]


def test_county_shapes_keeps_sweden_only_outer_rings_and_canonical_names():
    hole = square(0.2, 55.2, 0.1)
    geo = all_counties()
    kronoberg_feature = next(f for f in geo["features"] if f["properties"]["name"] == "Kronoberg")
    kronoberg_feature["geometry"]["coordinates"] = [square(20, 55), hole]
    shapes = county_shapes(geo)
    assert len(shapes) == 21
    assert [s["gid"] for s in shapes][:3] == ["SWE.1_1", "SWE.2_1", "SWE.3_1"]
    kronoberg = next(s for s in shapes if s["gid"] == "SWE.9_1")
    assert kronoberg["polygons"] == [square(20, 55)]
    assert next(s for s in shapes if s["gid"] == "SWE.11_1")["name"] == "Örebro"


def test_multipolygons_keep_every_island():
    geo = all_counties()
    gotland_feature = next(f for f in geo["features"] if f["properties"]["name"] == "Gotland")
    gotland_feature["geometry"] = {"type": "MultiPolygon", "coordinates": [[square(18, 57)], [square(19, 58)]]}
    gotland = next(s for s in county_shapes(geo) if s["gid"] == "SWE.4_1")
    assert len(gotland["polygons"]) == 2


def test_a_missing_or_doubled_county_fails_the_build():
    geo = all_counties()
    geo["features"].pop()  # drop Kronoberg
    with pytest.raises(ValueError, match="missing \\['SWE.9_1'\\]"):
        county_shapes(geo)
    geo = all_counties()
    geo["features"].append(feature("Skåne", [square(30, 55)]))
    with pytest.raises(ValueError, match="duplicated \\['SWE.13_1'\\]"):
        county_shapes(geo)


def test_to_typescript_emits_one_line_per_county():
    ts = to_typescript(county_shapes(all_counties()))
    assert 'export const SWEDISH_COUNTY_SHAPES: CountyShape[] = [' in ts
    assert '{ id: "SWE.9_1", name: "Kronoberg", polygons: [[[20,55],[21,55],[21,56],[20,56],[20,55]]] },' in ts
    assert ts.count("{ id:") == 21
