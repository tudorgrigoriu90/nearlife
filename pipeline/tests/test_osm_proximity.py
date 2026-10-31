"""T-049: which spots are near a major road, railway or coastline is measured here, locally, from
downloaded line geometry. Overpass's own `around` gave inconsistent empty answers (2026-10-31)."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from osm.proximity import bbox_around, lines_from, points_near_lines  # noqa: E402

M_PER_DEG_LAT = 111_320.0


def north(lat, lon, metres):
    return (lat + metres / M_PER_DEG_LAT, lon)


def east(lat, lon, metres):
    return (lat, lon + metres / (M_PER_DEG_LAT * math.cos(math.radians(lat))))


ROAD = [[(59.0, 18.0), (59.0, 18.01)]]  # an east-west segment ~570 m long near Stockholm


def test_a_spot_beside_the_road_is_near_and_one_further_away_is_not():
    near = north(59.0, 18.005, 25)
    far = north(59.0, 18.005, 40)
    assert points_near_lines({"a": near, "b": far}, ROAD, 30) == {"a"}


def test_distance_is_to_the_segment_not_only_its_ends():
    # Mid-segment, 25 m off: the ends are ~285 m away, the road itself is not.
    assert points_near_lines({"mid": north(59.0, 18.005, 25)}, ROAD, 30) == {"mid"}


def test_beyond_the_end_of_a_segment_the_end_point_counts():
    past_end = east(59.0, 18.01, 20)
    assert points_near_lines({"p": past_end}, ROAD, 30) == {"p"}
    assert points_near_lines({"p": east(59.0, 18.01, 45)}, ROAD, 30) == set()


def test_far_north_longitude_degrees_are_shorter():
    # At 68°N a degree of longitude is ~42 km, not 111 km; 25 m east of a north-south road is near.
    road = [[(68.0, 20.0), (68.01, 20.0)]]
    assert points_near_lines({"k": east(68.005, 20.0, 25)}, road, 30) == {"k"}
    assert points_near_lines({"k": east(68.005, 20.0, 40)}, road, 30) == set()


def test_multi_vertex_lines_and_many_points():
    coast = [[(57.0, 12.0), (57.001, 12.002), (57.002, 12.0), (57.003, 12.002)]]
    pts = {f"s{i}": north(57.0 + i * 0.001, 12.001, 0) for i in range(4)}
    pts["inland"] = east(57.0015, 12.002, 2000)
    assert points_near_lines(pts, coast, 300) == {"s0", "s1", "s2", "s3"}


def test_no_lines_means_nothing_is_near():
    assert points_near_lines({"a": (59.0, 18.0)}, [], 30) == set()


def test_a_point_just_across_a_grid_cell_boundary_is_still_found():
    # Brute force agrees with the grid for points scattered around the road.
    pts = {f"p{i}": north(59.0, 18.0 + i * 0.0004, (i % 7) * 9 - 27) for i in range(26)}
    want = set()
    for pid, (lat, lon) in pts.items():
        d = abs(lat - 59.0) * M_PER_DEG_LAT if 18.0 <= lon <= 18.01 else 1e9
        if d <= 30:
            want.add(pid)
    assert points_near_lines(pts, ROAD, 30) == want


def test_lines_are_read_from_overpass_out_geom():
    result = {"elements": [
        {"type": "way", "id": 1, "geometry": [{"lat": 59.0, "lon": 18.0}, {"lat": 59.1, "lon": 18.1}]},
        {"type": "way", "id": 2, "geometry": [{"lat": 59.0, "lon": 18.0}]},  # a single point is no line
        {"type": "node", "id": 3, "lat": 59.0, "lon": 18.0},
    ]}
    assert lines_from(result) == [[(59.0, 18.0), (59.1, 18.1)]]


def test_the_download_box_covers_every_spot_plus_the_radius():
    s, w, n, e = bbox_around({"a": (59.0, 18.0), "b": (59.5, 18.4)}, 300)
    assert s < 59.0 and n > 59.5 and w < 18.0 and e > 18.4
    assert (59.0 - s) * M_PER_DEG_LAT >= 300
