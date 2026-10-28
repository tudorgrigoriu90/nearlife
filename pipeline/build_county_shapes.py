"""Generate lib/geo/swedishCounties.ts from Natural Earth (T-090).

Run: `python pipeline/build_county_shapes.py`. Re-run only if the county map changes; the output is
committed, so the app never fetches geometry at runtime.
"""

import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from geo.county_shapes import NATURAL_EARTH_URL, county_shapes, to_typescript  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "lib" / "geo" / "swedishCounties.ts"


def main() -> None:
    with urllib.request.urlopen(NATURAL_EARTH_URL, timeout=120) as response:
        geojson = json.load(response)
    shapes = county_shapes(geojson)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(to_typescript(shapes), encoding="utf-8")
    points = sum(len(ring) for s in shapes for ring in s["polygons"])
    print(f"wrote {OUT.relative_to(ROOT)}: {len(shapes)} counties, {points} points")


if __name__ == "__main__":
    main()
