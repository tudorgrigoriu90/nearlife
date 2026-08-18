"""Vernacular (common) names per locale, from GBIF (T-187).

Every shipped species currently carries its Latin binomial as its `common_name`, so a card title
reads "Lutra lutra" as though that were what people call it. Names are the most visible text in the
app and the last big gap in v1.

GBIF's /species/{key}/vernacularNames returns **every language it holds in one call**, so this is
6,824 calls for all 18 locales rather than 18 separate passes. Its language codes are ISO 639-3
("swe"), sometimes 639-1 ("sv"), so both are accepted — and anything unmapped is **dropped rather
than guessed**, because putting a name in front of the wrong reader is worse than showing none.

Coverage will be uneven and that is expected: Swedish is excellent (Dyntaxa feeds GBIF), while the
immigrant-language roster is close to empty for most species. A missing name is not a failure — the
card falls back to the scientific name, which is what a field guide in those languages would print
anyway.
"""

# ISO 639-3 / 639-1 → the locale ids this app ships (media/templates_i18n.py).
_LANG_TO_LOCALE: dict[str, str] = {
    "eng": "en", "en": "en",
    "swe": "sv", "sv": "sv",
    "ara": "ar", "ar": "ar",
    "som": "so", "so": "so",
    "rus": "ru", "ru": "ru",
    "ukr": "uk", "uk": "uk",
    "fas": "fa", "per": "fa", "fa": "fa",
    "tur": "tr", "tr": "tr",
    "bos": "bs", "bs": "bs",
    "srp": "sr", "sr": "sr",
    "sqi": "sq", "alb": "sq", "sq": "sq",
    "vie": "vi", "vi": "vi",
    "tha": "th", "th": "th",
    "amh": "am", "am": "am",
    "tir": "ti", "ti": "ti",
    "ckb": "ckb",
    "kmr": "kmr", "kur": "kmr",
    "pus": "ps", "ps": "ps",
}


def parse_vernacular_names(payload: dict) -> dict[str, str]:
    """{locale: name} from a GBIF vernacularNames response.

    A name flagged `preferred` wins its language; otherwise the first one seen does. GBIF often
    holds several names per language and they are not ranked, so "first" is arbitrary but stable —
    and picking arbitrarily among real vernacular names is safe in a way that inventing one is not.
    """
    names: dict[str, str] = {}
    preferred: set[str] = set()
    for entry in payload.get("results", []) or []:
        locale = _LANG_TO_LOCALE.get((entry.get("language") or "").strip().lower())
        if locale is None:
            continue
        name = (entry.get("vernacularName") or "").strip()
        if not name:
            continue
        if entry.get("preferred"):
            names[locale] = name
            preferred.add(locale)
        elif locale not in names:
            names[locale] = name
    return names
