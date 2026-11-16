"""Pure aggregation for the GBIF presence pipeline (no network — unit-tested).

Turns raw (county, month, speciesKey, occurrenceCount) rows from the GBIF occurrence facets
into one presence record per (county, species): the set of months the species was recorded in
that county, and the total occurrence count. This is the per-region, per-month presence proxy
the notification engine and This Week screen consume (TSD §4).

Honesty note (TSD §7): GBIF records where *observers* went, not where animals are. These are
observation-based presence proxies, and we only ingest CC0/CC-BY records, so the picture is a
subset. Copy must stay honest ("active in your region this season").
"""

from typing import Iterable, Iterator

# A month is active for a species in a county only when it is really recorded then (T-268 · review
# B-04): at least this share of its busiest month there (the card's PRESENT_SHARE,
# lib/countyStats.ts) and at least this many records. One stray record used to make a month active,
# so the swift was "active in your region" in January in every county.
ACTIVE_SHARE = 0.05
MIN_ACTIVE_RECORDS = 3

# Birds that are not in Sweden in winter. If one of them is active in December, January or February
# in any county, the rule above is broken (the guard the pipeline and verify.py run).
SUMMER_MIGRANTS = (
    "Apus apus",
    "Hirundo rustica",
    "Cuculus canorus",
    "Delichon urbicum",
    "Pandion haliaetus",
    "Riparia riparia",
    "Oriolus oriolus",
    "Ficedula hypoleuca",
    "Phylloscopus trochilus",
    "Sylvia borin",
)
WINTER_MONTHS = (12, 1, 2)


def active_months(month_counts: list[int]) -> list[int]:
    """The 1-indexed months a species counts as active, from its 12 monthly counts."""
    busiest = max(month_counts, default=0)
    return [
        i + 1
        for i, c in enumerate(month_counts)
        if c >= MIN_ACTIVE_RECORDS and c >= busiest * ACTIVE_SHARE
    ]


def recorded_months(month_counts: list[int]) -> list[int]:
    """Every month with any record: the noise filter's breadth signal (T-136), not a season."""
    return [i + 1 for i, c in enumerate(month_counts) if c > 0]


def migrants_active_in_winter(records: Iterable[dict]) -> list[str]:
    """Summer migrants with a winter month among their active months, as readable lines."""
    out = []
    for r in records:
        if r["scientificName"] in SUMMER_MIGRANTS:
            winter = [m for m in r["activeMonths"] if m in WINTER_MONTHS]
            if winter:
                out.append(f"{r['scientificName']} in {r['county']}: {winter}")
    return out


def build_presence(rows: Iterable[tuple]) -> dict:
    """rows: iterable of (county_gid, month:int, species_key:int, count:int).

    Returns {(county_gid, species_key): {"months": set[int], "occurrences": int,
    "monthCounts": [12 ints, January first]}}. The monthly counts are what the card's county
    section shows (T-261): when in the year a species is seen there, and when most.
    """
    acc: dict = {}
    for county_gid, month, species_key, count in rows:
        entry = acc.setdefault(
            (county_gid, species_key), {"months": set(), "occurrences": 0, "monthCounts": [0] * 12}
        )
        entry["months"].add(month)
        entry["occurrences"] += count
        entry["monthCounts"][month - 1] += count
    return acc


def presence_records(
    presence: dict,
    county_name_by_gid: dict,
    scientific_name_by_key: dict,
) -> Iterator[dict]:
    """Flatten the presence map into serialisable records, sorted by county then prevalence."""
    records = []
    for (gid, key), entry in presence.items():
        counts = entry.get("monthCounts")  # absent from presence maps built before T-261
        records.append(
            {
                "county": gid,
                "countyName": county_name_by_gid.get(gid, gid),
                "speciesKey": key,
                "scientificName": scientific_name_by_key.get(key, str(key)),
                "activeMonths": active_months(counts) if counts else sorted(entry["months"]),
                "recordedMonths": recorded_months(counts) if counts else sorted(entry["months"]),
                "occurrences": entry["occurrences"],
                "monthCounts": counts,
            }
        )
    records.sort(key=lambda r: (r["county"], -r["occurrences"]))
    return iter(records)
