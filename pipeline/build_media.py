"""Source a license-clear photo for every species in a presence dataset (T-119).

Usage:
    python build_media.py data/presence_mammalia.json    # -> data/media_mammalia.json

For each distinct species it queries Wikipedia + Commons for a representative image with a
commercial-safe license (CC0 / public domain / CC BY / CC BY-SA), recording the image URL,
license, author, and source page for attribution. Every species gets an entry — `imageUrl` is
null when no free image exists, and the app falls back to the category emoji, so *something*
always shows. Prints an honest coverage report.

Images are NOT downloaded here — the manifest references Commons URLs. Hosting the binaries on
Supabase Storage (so the app serves them, not Wikimedia) is the load step, done once the storage
keys are available (see T-134).
"""

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except (AttributeError, ValueError):
    pass

from media.wikimedia import WikimediaClient


def distinct_species(presence: dict) -> list[dict]:
    seen = {}
    for r in presence["records"]:
        seen.setdefault(r["speciesKey"], r["scientificName"])
    return [{"speciesKey": k, "scientificName": n} for k, n in seen.items()]


def build(presence_path: Path) -> dict:
    presence = json.loads(presence_path.read_text(encoding="utf-8"))
    species = distinct_species(presence)
    client = WikimediaClient()

    media = []
    with_image = 0
    by_license: dict = {}
    for i, sp in enumerate(species, 1):
        found = None
        try:
            found = client.fetch_image(sp["scientificName"])
        except Exception as exc:  # network hiccup on one species must not abort the run
            print(f"  ! {sp['scientificName']}: {exc}", flush=True)
        entry = {"speciesKey": sp["speciesKey"], "scientificName": sp["scientificName"]}
        if found:
            entry.update(found)
            with_image += 1
            by_license[found["license"]] = by_license.get(found["license"], 0) + 1
        else:
            entry["imageUrl"] = None
        media.append(entry)
        if i % 25 == 0:
            print(f"  {i}/{len(species)} processed, {with_image} with image", flush=True)

    return {
        "meta": {
            "source": "Wikipedia + Wikimedia Commons",
            "taxonFrom": presence_path.name,
            "totalSpecies": len(species),
            "withImage": with_image,
            "withoutImage": len(species) - with_image,
            "coveragePct": round(100 * with_image / len(species), 1) if species else 0,
            "byLicense": by_license,
            "note": (
                "Commercial-safe licenses only (CC0/PD/CC BY/CC BY-SA); attribution recorded. "
                "Null imageUrl → app uses the category-emoji fallback. Binaries hosted on "
                "Supabase Storage at load time."
            ),
        },
        "media": media,
    }


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    presence_path = Path(argv[0])
    if not presence_path.exists():
        print(f"no such file: {presence_path}")
        return 2
    payload = build(presence_path)
    out = presence_path.parent / presence_path.name.replace("presence_", "media_")
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    m = payload["meta"]
    print(
        f"wrote {out} — {m['withImage']}/{m['totalSpecies']} species with a license-clear photo "
        f"({m['coveragePct']}%)",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
