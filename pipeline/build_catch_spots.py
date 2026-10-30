"""Fetch every county's catch spots from OpenStreetMap (T-046 · T-049).

For each county: the spots, then the ids of spots near the coast, inside protected or military land,
and near major roads (osm/overpass.py), assembled by osm/spots.py into
data/catch_spots_<ISO>.json. Excluded spots are KEPT in the file with their flags, so the density
audit (T-050) can see what each rule cost. The loader (T-048) never surfaces a flagged spot.

    python pipeline/build_catch_spots.py               # all 21 counties (CI: catch-spots.yml)
    python pipeline/build_catch_spots.py SE-G          # one county, e.g. a smoke test

Map data © OpenStreetMap contributors, ODbL (DATA-SOURCING §4). The files stay internal (T-008).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from osm.counties import ISO_BY_GADM  # noqa: E402
from osm.overpass import (  # noqa: E402
    MILITARY_FILTERS,
    RESERVE_FILTERS,
    OverpassClient,
    ids_from,
    inside_query,
    near_coast_query,
    near_roads_query,
    spots_query,
)
from osm.spots import county_spots, summary  # noqa: E402

DATA = Path(__file__).resolve().parent / "data"


def build_county(client: OverpassClient, region_id: str, iso: str) -> list[dict]:
    def step(name: str, query: str) -> dict:
        try:
            return client.run(query)
        except Exception as exc:
            raise RuntimeError(f"{name}: {exc}") from exc  # which of the five queries the county lost

    spots = step("spots", spots_query(iso))
    near_coast = ids_from(step("near coast", near_coast_query(iso)))
    reserves = ids_from(step("reserves", inside_query(iso, RESERVE_FILTERS)))
    military = ids_from(step("military", inside_query(iso, MILITARY_FILTERS)))
    roads = ids_from(step("near roads", near_roads_query(iso)))
    return county_spots(region_id, spots, near_coast, reserves, military, roads)


def main(argv: list[str]) -> int:
    wanted = set(argv)
    client = OverpassClient()
    failed = []
    for region_id, iso in ISO_BY_GADM.items():
        if wanted and iso not in wanted:
            continue
        try:
            spots = build_county(client, region_id, iso)
        except Exception as exc:  # one county failing must not discard the others
            print(f"! {iso}: {exc}", flush=True)
            failed.append(iso)
            continue
        out = DATA / f"catch_spots_{iso}.json"
        out.write_text(
            json.dumps(
                {"meta": {"source": "© OpenStreetMap contributors (ODbL)", "region_id": region_id, **summary(spots)},
                 "spots": spots},
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        print(f"{iso} {region_id}: {json.dumps(summary(spots), ensure_ascii=False)}", flush=True)
    if failed:
        print(f"failed counties: {' '.join(failed)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
