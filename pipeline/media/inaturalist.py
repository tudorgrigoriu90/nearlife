"""iNaturalist as the second photo source (T-220).

Wikipedia's lead image leaves ~30% of the catalogue without a commercial-safe photo, mostly
insects. iNaturalist holds community photos for most of them, each under its photographer's own
licence, and many are CC0 / CC BY / CC BY-SA. Only those ship (media/licenses.inat_license); NC
and ND photos, iNaturalist's default licence, are skipped.

Flow: scientific name → /v1/taxa search, exact species match (or a synonym via matched_term) →
the taxon's default photo if its licence is safe, else the first safe photo among its taxon photos.
The 500 px "medium" size is re-hosted. The source page is the photo's iNaturalist page, which
carries the photographer and licence.

The API asks for at most ~1 request per second and a descriptive User-Agent. The client keeps to
that. Photo files come from iNaturalist's open-data bucket, not the API.
"""

import re
import time

import requests

from media.licenses import inat_license

API = "https://api.inaturalist.org/v1"


def _norm(name: str | None) -> str:
    return " ".join((name or "").lower().split())


def taxon_match(results: list[dict], scientific_name: str) -> dict | None:
    """The search result that is this species: exact name, else a synonym it was found under."""
    want = _norm(scientific_name)
    for r in results:
        if r.get("rank") == "species" and _norm(r.get("name")) == want:
            return r
    for r in results:
        if r.get("rank") == "species" and _norm(r.get("matched_term")) == want:
            return r
    return None


def pick_photo(photos: list[dict]) -> dict | None:
    return next((p for p in photos if p and inat_license(p.get("license_code"))), None)


def sized(photo: dict) -> str:
    if photo.get("medium_url"):
        return photo["medium_url"]
    return re.sub(r"/square\.(\w+)$", r"/medium.\1", photo["url"])


_AUTHOR = re.compile(r"^(?:\(c\)\s*)?(.+?),\s*(?:some|no|all) rights reserved", re.IGNORECASE)


def author_of(photo: dict) -> str:
    if photo.get("attribution_name"):
        return photo["attribution_name"]
    m = _AUTHOR.match(photo.get("attribution") or "")
    return m.group(1).strip() if m else "Unknown"


class INaturalistClient:
    def __init__(self, pause: float = 1.1, max_retries: int = 5):
        self.pause = pause
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "nearby-nearlife-pipeline/0.1 (species photos; github.com/tudorgrigoriu90/nearlife)"}
        )

    def _get(self, path: str, params: dict | None = None) -> dict:
        delay = 30.0
        for _ in range(self.max_retries):
            time.sleep(self.pause)
            resp = self.session.get(f"{API}{path}", params=params, timeout=60)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(delay)  # rate limited or busy: wait, never hammer
                delay = min(delay * 2, 300.0)
                continue
            resp.raise_for_status()
            return resp.json()
        resp.raise_for_status()
        return resp.json()

    def fetch_image(self, scientific_name: str) -> dict | None:
        """{imageUrl, license, author, sourceUrl} in the app's licence form, or None."""
        found = self._get("/taxa", {"q": scientific_name, "rank": "species", "is_active": "true", "per_page": 10})
        taxon = taxon_match(found.get("results", []), scientific_name)
        if taxon is None:
            return None
        photo = pick_photo([taxon.get("default_photo")])
        if photo is None:
            detail = self._get(f"/taxa/{taxon['id']}").get("results", [])
            photos = [tp.get("photo") for tp in (detail[0].get("taxon_photos", []) if detail else [])]
            photo = pick_photo(photos)
        if photo is None:
            return None
        return {
            "imageUrl": sized(photo),
            "license": inat_license(photo["license_code"]),
            "author": author_of(photo),
            "sourceUrl": f"https://www.inaturalist.org/photos/{photo['id']}",
        }
