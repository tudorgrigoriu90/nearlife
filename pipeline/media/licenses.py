"""License classification for sourced species photos (pure, unit-tested).

Only commercial-safe licenses are accepted (DATA-SOURCING-LICENSING.md §5): CC0, public domain,
CC BY, CC BY-SA. Anything non-commercial (NC) or no-derivatives (ND) — and anything we don't
positively recognise — is rejected, so an unknown/unsafe license never ships.
"""


def is_allowed_license(short_name: str | None) -> bool:
    if not short_name:
        return False
    s = short_name.strip().lower()
    # Reject non-commercial / no-derivatives outright (covers CC BY-NC, CC BY-ND, CC BY-NC-SA…).
    if "nc" in s or "nd" in s:
        return False
    if s.startswith("cc0"):
        return True
    if s.startswith("cc by"):  # CC BY and CC BY-SA (NC/ND already excluded above)
        return True
    if "public domain" in s or s in {"pd", "cc pd"}:
        return True
    return False


def app_license(short_name: str | None) -> str | None:
    """Map a Wikimedia licence short name to the app's MediaLicense (CC0 / CC-BY / CC-BY-SA).

    None for anything not commercial-safe or not recognised — the photo then does not ship.
    """
    if not short_name:
        return None
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


_INAT = {"cc0": "CC0", "cc-by": "CC-BY", "cc-by-sa": "CC-BY-SA"}


def inat_license(code: str | None) -> str | None:
    """Map an iNaturalist `license_code` to the app's MediaLicense (T-220).

    iNaturalist codes are exact (`cc-by-nc`, `cc-by-nd`, …, or null for all rights reserved), so
    this is an allow-list lookup: anything not listed, including every NC/ND code, does not ship.
    """
    return _INAT.get((code or "").strip().lower())
