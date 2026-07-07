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
