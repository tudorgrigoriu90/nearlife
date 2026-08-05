"""Build `public.species_content` rows from generated content JSON (pure — unit-tested).

Turns build_content.py output (pipeline/data/content_*.json) into the rows the content loader
upserts (pipeline/gbif/supabase_load_content.py). Species ids are ``gbif:<key>`` — the same
ids the species/presence loader writes (gbif/db_rows.py), so the FK lines up.

Only species with a **grounded** (non-empty) fact become rows: `species_content.fact` is NOT NULL
and the app treats `fact` as required (lib/speciesRepository.ts:`SpeciesContentRow`). A missing
fact is reported and skipped, **never fabricated** (design invariant #1, honest copy).

Known gap (T-146): give/protect are safe *mission* content that invariant #2 says should be free
for **every** species — including fact-less ones — but the current schema can't store a row without
a fact. Surfacing mission-only content needs a schema/product decision, tracked separately.
"""

from typing import Iterable

from gbif.db_rows import species_id_for


def _content_items(payload) -> list[dict]:
    """Accept either a build_content.py payload ({"meta", "content"}) or a bare content list."""
    if isinstance(payload, dict) and "content" in payload:
        return payload["content"]
    return list(payload)


def build_content_rows(
    payloads: Iterable, locale: str = "en"
) -> tuple[list[dict], dict]:
    """payloads: iterable of content payloads (or bare content lists).

    Returns ``(rows, summary)``. ``rows`` are species_content upsert dicts; ``summary`` reports
    coverage honestly: ``total`` items seen, ``with_fact`` loaded, ``skipped_no_fact``, ``skipped_dup``.
    The generated content is English (status=machine); Swedish rows arrive later via the
    review-gated translation (T-127/T-135), which is why ``locale`` defaults to ``"en"``.
    """
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()
    total = skipped_no_fact = skipped_dup = 0

    for payload in payloads:
        for item in _content_items(payload):
            total += 1
            fact = item.get("fact")
            if not fact or not str(fact).strip():
                skipped_no_fact += 1
                continue
            species_id = species_id_for(item["speciesKey"])
            key = (species_id, locale)
            if key in seen:
                skipped_dup += 1
                continue
            seen.add(key)
            rows.append(
                {
                    "species_id": species_id,
                    "locale": locale,
                    "common_name": None,  # localized names come from names.sv / review, not here
                    "fact": fact,
                    "when_how": item["whenAndHow"],
                    "give": item["give"],
                    "protect": item["protect"],
                    "always_free": True,  # invariant #2 — Tier-1 fact + give/protect always free
                }
            )

    summary = {
        "total": total,
        "with_fact": len(rows),
        "skipped_no_fact": skipped_no_fact,
        "skipped_dup": skipped_dup,
    }
    return rows, summary
