"""Build `public.species_content` rows from generated content JSON (pure — unit-tested).

Turns build_content.py output (pipeline/data/content_*.json) into the rows the content loader
upserts (pipeline/gbif/supabase_load_content.py). Species ids are ``gbif:<key>`` — the same
ids the species/presence loader writes (gbif/db_rows.py), so the FK lines up.

**Every** species becomes a row — including those with no Wikipedia article (T-146). Their safe
give/protect/when-how mission content must be free for every species (invariant #2), so a row is
written with ``fact = None`` (the column is nullable; the card hides the fact block and still shows
the mission). A fact is never fabricated (invariant #1) — absent stays absent. Coverage is reported
honestly so a low fact rate is visible, not hidden.
"""

from typing import Iterable

from gbif.db_rows import species_id_for


def _content_items(payload) -> list[dict]:
    """Accept either a build_content.py payload ({"meta", "content"}) or a bare content list."""
    if isinstance(payload, dict) and "content" in payload:
        return payload["content"]
    return list(payload)


def build_content_rows(payloads: Iterable, locale: str = "en") -> tuple[list[dict], dict]:
    """payloads: iterable of content payloads (or bare content lists).

    Returns ``(rows, summary)``. ``rows`` are species_content upsert dicts, one per distinct
    (species, locale); ``summary`` reports coverage honestly: ``total`` items seen, ``with_fact`` /
    ``without_fact`` loaded, and ``skipped_dup``.

    Each item carries its own ``locale`` (T-181/T-183). The ``locale`` argument is only the fallback
    for payloads written before that field existed. Stamping every row with one locale instead would
    collapse all 18 languages onto the same dedupe key and silently keep whichever arrived first —
    a successful-looking load that discards seventeen languages of work.
    """
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()
    total = with_fact = without_fact = skipped_dup = 0

    for payload in payloads:
        for item in _content_items(payload):
            total += 1
            species_id = species_id_for(item["speciesKey"])
            row_locale = item.get("locale") or locale
            key = (species_id, row_locale)
            if key in seen:
                skipped_dup += 1
                continue
            seen.add(key)

            raw_fact = item.get("fact")
            fact = raw_fact if (raw_fact and str(raw_fact).strip()) else None
            if fact is None:
                without_fact += 1
            else:
                with_fact += 1

            rows.append(
                {
                    "species_id": species_id,
                    "locale": row_locale,
                    "common_name": None,  # localized names come from names.sv / review, not here
                    "fact": fact,  # None when there's no article — never fabricated (invariant #1)
                    "when_how": item["whenAndHow"],
                    "give": item["give"],
                    "protect": item["protect"],
                    "always_free": True,  # invariant #2 — mission is free for every species
                }
            )

    summary = {
        "total": total,
        "with_fact": with_fact,
        "without_fact": without_fact,
        "skipped_dup": skipped_dup,
    }
    return rows, summary
