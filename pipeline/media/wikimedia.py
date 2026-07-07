"""Fetch a representative, license-clear species photo from Wikipedia + Wikimedia Commons.

Flow (verified): scientific name → en.wikipedia lead image (follows redirects) → Commons
imageinfo (license, author, source page). Only commercial-safe licenses are kept (see
media/licenses.py). Returns None when there is no page image or the license is not allowed —
the caller records the species with a null image and the app falls back to the category emoji.
"""

import time
import urllib.parse

import requests

from media.licenses import is_allowed_license
from media.text import strip_html

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


class WikimediaClient:
    def __init__(self, pause: float = 0.6, timeout: int = 30, max_retries: int = 7):
        self.session = requests.Session()
        # Wikimedia asks for a descriptive UA; being polite also reduces throttling.
        self.session.headers.update(
            {"User-Agent": "nearby-nearlife-media/0.1 (https://github.com/tudorgrigoriu90/nearlife)"}
        )
        self.pause = pause
        self.timeout = timeout
        self.max_retries = max_retries

    def _get(self, base: str, params: dict) -> dict:
        delay = 2.0
        for _ in range(self.max_retries):
            resp = self.session.get(f"{base}?{urllib.parse.urlencode(params)}", timeout=self.timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                retry_after = resp.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else delay
                time.sleep(wait)
                delay = min(delay * 2, 60.0)
                continue
            resp.raise_for_status()
            if self.pause:
                time.sleep(self.pause)
            return resp.json()
        resp.raise_for_status()
        return resp.json()

    def _lead_image_file(self, scientific_name: str) -> tuple[str | None, str | None]:
        data = self._get(
            WIKI_API,
            {
                "action": "query",
                "format": "json",
                "prop": "pageimages",
                "piprop": "name|original",
                "titles": scientific_name,
                "redirects": 1,
            },
        )
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return None, None
        page = next(iter(pages.values()))
        return page.get("pageimage"), page.get("title")

    def _commons_info(self, file_name: str) -> dict | None:
        data = self._get(
            COMMONS_API,
            {
                "action": "query",
                "format": "json",
                "prop": "imageinfo",
                "titles": f"File:{file_name}",
                "iiprop": "url|extmetadata",
            },
        )
        pages = data.get("query", {}).get("pages", {})
        page = next(iter(pages.values()), {})
        infos = page.get("imageinfo")
        return infos[0] if infos else None

    def fetch_image(self, scientific_name: str) -> dict | None:
        """Return {imageUrl, license, licenseUrl, author, sourceUrl, wikiTitle} or None."""
        file_name, wiki_title = self._lead_image_file(scientific_name)
        if not file_name:
            return None
        info = self._commons_info(file_name)
        if not info:
            return None
        md = info.get("extmetadata", {})
        license_name = md.get("LicenseShortName", {}).get("value")
        if not is_allowed_license(license_name):
            return None
        return {
            "imageUrl": info.get("url"),
            "license": license_name,
            "licenseUrl": md.get("LicenseUrl", {}).get("value"),
            "author": strip_html(md.get("Artist", {}).get("value")),
            "sourceUrl": info.get("descriptionurl"),
            "wikiTitle": wiki_title,
        }
