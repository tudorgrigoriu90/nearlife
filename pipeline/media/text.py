"""Small text helpers for media metadata (pure, unit-tested)."""

import re

_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")


def strip_html(value: str | None) -> str:
    """Commons `Artist`/`Credit` fields are HTML; reduce to plain attribution text."""
    if not value:
        return ""
    text = _TAG.sub("", value)
    text = text.replace("&amp;", "&").replace("&nbsp;", " ")
    return _WS.sub(" ", text).strip()
