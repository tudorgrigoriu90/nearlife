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


def build_content_rows(
    payloads: Iterable,
    locale: str = "en",
    curated_id_by_gbif_key: dict[int, str] | None = None,
) -> tuple[list[dict], dict]:
    """payloads: iterable of content payloads (or bare content lists).

    Returns ``(rows, summary)``. ``rows`` are species_content upsert dicts, one per distinct
    (species, locale); ``summary`` reports coverage honestly: ``total`` items seen, ``with_fact`` /
    ``without_fact`` loaded, and ``skipped_dup``.

    Each item carries its own ``locale`` (T-181/T-183). The ``locale`` argument is only the fallback
    for payloads written before that field existed. Stamping every row with one locale instead would
    collapse all 18 languages onto the same dedupe key and silently keep whichever arrived first —
    a successful-looking load that discards seventeen languages of work.

    ``curated_id_by_gbif_key`` lists the species the database already holds under a curated id
    (T-210). Their generated rows are **skipped**, not remapped: the curated 54 carry hand-written
    content in 38 locales, which an upsert of template text would overwrite. Writing them under
    ``gbif:<key>`` instead is what failed the August 2026 load — that id no longer exists once the
    species loader has adopted the curated one (T-184), so the first such row broke the FK and
    rolled back every language for every species.
    """
    curated = curated_id_by_gbif_key or {}
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()
    total = with_fact = without_fact = skipped_dup = skipped_curated = 0

    for payload in payloads:
        for item in _content_items(payload):
            total += 1
            if int(item["speciesKey"]) in curated:
                skipped_curated += 1
                continue
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
                    # Sourced from GBIF per locale (T-188). Blank normalises to None: an empty
                    # string renders as a blank title, which is worse than the binomial.
                    "common_name": (item.get("commonName") or "").strip() or None,
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
        "skipped_curated": skipped_curated,
    }
    return rows, summary


def keep_known_species(rows: list[dict], known_ids: set[str]) -> tuple[list[dict], set[str]]:
    """Split rows into those whose species exists and the set of species ids that do not.

    One orphan row used to abort the whole load (FK violation → rollback of every row). An orphan
    means the content was generated for a species the species loader did not write — a data
    mismatch worth reporting, not a reason to ship no content at all. The caller decides how many
    orphans are tolerable.
    """
    kept = [r for r in rows if r["species_id"] in known_ids]
    missing = {r["species_id"] for r in rows if r["species_id"] not in known_ids}
    return kept, missing
