"""Source a license-clear hero photo for each curated Kronoberg species (T-119).

Reads the curated set straight from `lib/species/kronoberg.ts` (the 54 species the app runs on),
queries Wikipedia + Wikimedia Commons for a representative, commercial-safe image
(CC0 / public domain / CC BY / CC BY-SA), and writes `pipeline/data/media_kronoberg.json` keyed by
the app's own species id. Attribution (author, license, source page) is captured per photo.

Images are NOT downloaded here — see `pipeline/media/supabase_upload.py` for the re-host step
(download the original + upload to Supabase Storage). The app manifest is generated from this JSON
by `scripts/gen-kronoberg-media.ts`. Run: `python pipeline/build_kronoberg_media.py`.
"""

import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except (AttributeError, ValueError):
    pass

sys.path.insert(0, str(Path(__file__).parent))
from media.wikimedia import WikimediaClient  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SPECIES_TS = ROOT / "lib" / "species" / "kronoberg.ts"
OUT = ROOT / "pipeline" / "data" / "media_kronoberg.json"

# One uniform object per line in kronoberg.ts — parse id + scientificName + category.
ROW_RE = re.compile(
    r"id:\s*'([^']+)',\s*scientificName:\s*'([^']+)',\s*commonName:\s*'[^']+',\s*category:\s*'([^']+)'"
)


def curated_species() -> list[dict]:
    text = SPECIES_TS.read_text(encoding="utf-8")
    rows = ROW_RE.findall(text)
    return [{"speciesId": r[0], "scientificName": r[1], "category": r[2]} for r in rows]


def app_license(short_name: str) -> str | None:
    """Map a Wikimedia license short name to the app's MediaLicense enum (CC0/CC-BY/CC-BY-SA)."""
    s = short_name.strip().lower()
    if "nc" in s or "nd" in s:
        return None
    if s.startswith("cc0") or "public domain" in s or s in {"pd", "cc pd"}:
        return "CC0"
    if s.startswith("cc by-sa"):
        return "CC-BY-SA"
    if s.startswith("cc by"):
        return "CC-BY"
    return None


def ext_of(url: str) -> str:
    tail = url.split("?", 1)[0].rsplit(".", 1)[-1].lower()
    return "jpg" if tail in ("jpeg", "jpe") else tail


def main() -> int:
    species = curated_species()
    if len(species) != 54:
        print(f"! expected 54 curated species, parsed {len(species)} — check the parser", flush=True)
    client = WikimediaClient()

    out = []
    with_image = 0
    by_license: dict = {}
    for i, sp in enumerate(species, 1):
        found = None
        try:
            found = client.fetch_image(sp["scientificName"])
        except Exception as exc:  # one species' network hiccup must not abort the run
            print(f"  ! {sp['scientificName']}: {exc}", flush=True)
        entry = dict(sp)
        lic = app_license(found["license"]) if found else None
        if found and lic:
            entry.update(
                imageUrl=found["imageUrl"],
                appLicense=lic,
                licenseRaw=found["license"],
                author=found["author"] or "Unknown",
                sourceUrl=found["sourceUrl"],
                ext=ext_of(found["imageUrl"]),
            )
            with_image += 1
            by_license[lic] = by_license.get(lic, 0) + 1
        else:
            entry["imageUrl"] = None
        out.append(entry)
        print(f"  {i:>2}/{len(species)} {sp['speciesId']}: {'OK ' + entry.get('appLicense', '') if entry['imageUrl'] else 'no free image'}", flush=True)

    payload = {
        "meta": {
            "source": "Wikipedia + Wikimedia Commons",
            "totalSpecies": len(species),
            "withImage": with_image,
            "withoutImage": len(species) - with_image,
            "coveragePct": round(100 * with_image / len(species), 1) if species else 0,
            "byLicense": by_license,
            "note": "Commercial-safe licenses only (CC0/PD/CC BY/CC BY-SA). Null imageUrl → emoji fallback.",
        },
        "media": out,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    m = payload["meta"]
    print(f"\nwrote {OUT} — {m['withImage']}/{m['totalSpecies']} with a photo ({m['coveragePct']}%)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
