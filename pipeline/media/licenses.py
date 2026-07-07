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
