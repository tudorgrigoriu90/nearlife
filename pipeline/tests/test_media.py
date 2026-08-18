"""Tests for the pure media helpers (license classification + HTML stripping)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.licenses import is_allowed_license  # noqa: E402
from media.text import strip_html  # noqa: E402


def test_allowed_licenses():
    for name in ["CC0", "CC0 1.0", "Public domain", "CC BY 2.0", "CC BY-SA 4.0", "cc by-sa 3.0"]:
        assert is_allowed_license(name) is True, name


def test_rejected_licenses():
    for name in [
        "CC BY-NC 4.0",
        "CC BY-ND 4.0",
        "CC BY-NC-SA 4.0",
        "GFDL",
        "All rights reserved",
        "",
        None,
    ]:
        assert is_allowed_license(name) is False, name


def test_strip_html_extracts_attribution_text():
    raw = '<a href="//commons.wikimedia.org/wiki/User:ClaudiaTen" title="User:ClaudiaTen">ClaudiaTen</a>'
    assert strip_html(raw) == "ClaudiaTen"


def test_strip_html_handles_entities_and_whitespace():
    assert strip_html("Jane&nbsp;Doe   &amp;  friends") == "Jane Doe & friends"
    assert strip_html(None) == ""
    assert strip_html("<span>  plain  </span>") == "plain"


# ── Thumbnail tier (T-168) ───────────────────────────────────────────────────
# The app ships a ~40 KB thumbnail and links out to the full-resolution original on Commons.
# Storage is the reason: at ~6,800 kept Swedish species a full-size photo each would fill the
# 1 GB Supabase free tier before Norway, Denmark, Finland and Iceland are even ingested. A 400px
# thumbnail is ~40 KB, which is ~270 MB for Sweden and leaves room for the rest.
#
# Commons does the resizing (iiurlwidth), so the pipeline downloads 40 KB rather than fetching a
# 5 MB original and shrinking it — kinder to Wikimedia and far faster over thousands of species.

from media.wikimedia import THUMB_WIDTH, pick_image_urls  # noqa: E402


def test_prefers_the_commons_thumbnail_over_the_original():
    urls = pick_image_urls({"url": "https://x/orig.jpg", "thumburl": "https://x/400px-orig.jpg"})
    assert urls.display == "https://x/400px-orig.jpg"
    assert urls.original == "https://x/orig.jpg"


def test_falls_back_to_the_original_when_commons_returns_no_thumb():
    # Some file types (SVG, tiny images) come back without a thumburl. Better a large image than
    # no image — the alternative is a card with a glyph where a photo exists.
    urls = pick_image_urls({"url": "https://x/orig.jpg"})
    assert urls.display == "https://x/orig.jpg"
    assert urls.original == "https://x/orig.jpg"


def test_returns_none_when_there_is_no_image_at_all():
    assert pick_image_urls({}) is None
    assert pick_image_urls({"thumburl": "https://x/t.jpg"}) is None  # no original to link to


def test_thumb_width_is_the_documented_size():
    # Pinned so a casual change cannot quietly multiply the storage bill.
    assert THUMB_WIDTH == 400
