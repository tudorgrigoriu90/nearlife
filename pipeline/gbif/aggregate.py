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


def build_presence(rows: Iterable[tuple]) -> dict:
    """rows: iterable of (county_gid, month:int, species_key:int, count:int).

    Returns {(county_gid, species_key): {"months": set[int], "occurrences": int}}.
    """
    acc: dict = {}
    for county_gid, month, species_key, count in rows:
        entry = acc.setdefault((county_gid, species_key), {"months": set(), "occurrences": 0})
        entry["months"].add(month)
        entry["occurrences"] += count
    return acc


def presence_records(
    presence: dict,
    county_name_by_gid: dict,
    scientific_name_by_key: dict,
) -> Iterator[dict]:
    """Flatten the presence map into serialisable records, sorted by county then prevalence."""
    records = [
        {
            "county": gid,
            "countyName": county_name_by_gid.get(gid, gid),
            "speciesKey": key,
            "scientificName": scientific_name_by_key.get(key, str(key)),
            "activeMonths": sorted(entry["months"]),
            "occurrences": entry["occurrences"],
        }
        for (gid, key), entry in presence.items()
    ]
    records.sort(key=lambda r: (r["county"], -r["occurrences"]))
    return iter(records)
