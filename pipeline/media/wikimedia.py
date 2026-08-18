"""Fetch a representative, license-clear species photo from Wikipedia + Wikimedia Commons.

Flow (verified): scientific name → en.wikipedia lead image (follows redirects) → Commons
imageinfo (license, author, source page). Only commercial-safe licenses are kept (see
media/licenses.py). Returns None when there is no page image or the license is not allowed —
the caller records the species with a null image and the app falls back to the category emoji.
"""

import re
import time
import urllib.parse
from dataclasses import dataclass

import requests

from media.licenses import is_allowed_license
from media.text import strip_html

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Facts are *sourced* per language rather than translated (T-179): every Wikipedia edition holds
# the same species under the same scientific name, written natively and under the same CC BY-SA we
# already attribute. That is better prose than machine translation and costs nothing per species.
_LANG = re.compile(r"^[a-z]{2,3}$")


def wiki_api_for(lang: str) -> str:
    """API endpoint for a language edition. Raises on anything that is not a language code.

    The code is interpolated into a URL, so an unvalidated value is a request to an arbitrary
    host. Locale forms are accepted and reduced to their language: Wikipedia is keyed by language,
    and there is no pt-BR.wikipedia.org.
    """
    code = re.split(r"[-_]", (lang or "").strip())[0].lower()
    if not _LANG.match(code):
        raise ValueError(f"not a Wikipedia language code: {lang!r}")
    return f"https://{code}.wikipedia.org/w/api.php"


# Width of the thumbnail the app ships. ~40 KB at this size; see docs/DATA-SOURCING-LICENSING.md.
# Full resolution is never re-hosted — the card links out to the Commons file page instead, which
# costs no storage and gives the reader the licence and author alongside the image.
THUMB_WIDTH = 400


@dataclass(frozen=True)
class ImageUrls:
    """`display` is what the app shows; `original` is what "view full size" links to."""

    display: str
    original: str


def pick_image_urls(info: dict) -> "ImageUrls | None":
    """Choose the shipped image and its full-size counterpart from a Commons imageinfo blob.

    Returns None when there is no original: a thumbnail with nothing behind it cannot be
    attributed properly, and attribution is a licence condition, not a nicety.
    """
    original = info.get("url")
    if not original:
        return None
    # Some files (SVGs, already-small images) come back with no thumburl. A large image beats no
    # image — the alternative is a glyph on a card where a real photo exists.
    return ImageUrls(display=info.get("thumburl") or original, original=original)


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

    def _commons_info(self, file_name: str) -> dict | None:  # noqa: D401
        data = self._get(
            COMMONS_API,
            {
                "action": "query",
                "format": "json",
                "prop": "imageinfo",
                "titles": f"File:{file_name}",
                "iiprop": "url|extmetadata",
                # Let Commons do the resizing: the pipeline then downloads ~40 KB instead of a
                # multi-megabyte original, which matters over thousands of species and is far
                # kinder to Wikimedia's servers than fetching full-res and shrinking locally.
                "iiurlwidth": THUMB_WIDTH,
            },
        )
        pages = data.get("query", {}).get("pages", {})
        page = next(iter(pages.values()), {})
        infos = page.get("imageinfo")
        return infos[0] if infos else None

    def fetch_extract(self, scientific_name: str, lang: str = "en") -> str | None:
        """A grounded 1–2 sentence intro from Wikipedia (CC BY-SA — attribute at the card).

        Used to seed the species 'fact' at national scale (T-135). `lang` selects the Wikipedia
        edition, so a Somali reader gets a fact written in Somali rather than a translation of the
        English one (T-179). Returns None when that edition has no article, so the caller can leave
        the fact blank rather than fabricate one — `species_content.fact` is nullable for exactly
        this case (T-146), and give/protect stay present regardless (invariant #2).
        """
        data = self._get(
            wiki_api_for(lang),
            {
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "exintro": 1,
                "explaintext": 1,
                "exsentences": 2,
                "titles": scientific_name,
                "redirects": 1,
            },
        )
        pages = data.get("query", {}).get("pages", {})
        page = next(iter(pages.values()), {})
        extract = (page.get("extract") or "").strip()
        return extract or None

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
        urls = pick_image_urls(info)
        if urls is None:
            return None
        return {
            "imageUrl": urls.display,
            "originalUrl": urls.original,
            "license": license_name,
            "licenseUrl": md.get("LicenseUrl", {}).get("value"),
            "author": strip_html(md.get("Artist", {}).get("value")),
            "sourceUrl": info.get("descriptionurl"),
            "wikiTitle": wiki_title,
        }
