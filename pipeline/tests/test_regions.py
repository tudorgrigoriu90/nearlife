"""Nordic region configuration (T-167).

v1 widens from Sweden to the five Nordic countries. GADM subdivision ids are *fetched*, never
hardcoded for the new countries: an invented `NOR.3_1` would slice occurrences by the wrong region
and produce data that looks right and is not. Sweden's list stays checked in because it is already
verified and in use, and it doubles as the fixture proving the parser.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.counties import (  # noqa: E402
    COUNTY_NAME_BY_GID,
    NORDIC_COUNTRIES,
    SWEDISH_COUNTIES,
    country_of,
    parse_subdivisions,
)


def test_nordic_countries_are_the_five():
    assert [c["iso3"] for c in NORDIC_COUNTRIES] == ["SWE", "NOR", "DNK", "FIN", "ISL"]


def test_every_country_carries_the_iso2_the_occurrence_api_needs():
    # /occurrence/search filters on the 2-letter code while /geocode/gadm uses the 3-letter one;
    # carrying both stops a caller guessing one from the other.
    assert {c["iso2"] for c in NORDIC_COUNTRIES} == {"SE", "NO", "DK", "FI", "IS"}


def test_sweden_is_still_the_verified_21():
    assert len(SWEDISH_COUNTIES) == 21
    assert COUNTY_NAME_BY_GID["SWE.9_1"] == "Kronoberg"


def test_country_of_reads_the_gid_prefix():
    assert country_of("SWE.9_1") == "SWE"
    assert country_of("NOR.3_1") == "NOR"


def test_parse_subdivisions_maps_the_geocode_payload():
    payload = [
        {"id": "NOR.1_1", "name": "Agder"},
        {"id": "NOR.2_1", "name": "Innlandet"},
    ]
    assert parse_subdivisions(payload) == [
        {"gid": "NOR.1_1", "name": "Agder"},
        {"gid": "NOR.2_1", "name": "Innlandet"},
    ]


def test_parse_subdivisions_accepts_the_gid_spelling_too():
    # GBIF has used both `id` and `gid` for this field; accept either rather than silently
    # returning an empty region list, which would make the ingest quietly fetch nothing.
    assert parse_subdivisions([{"gid": "DNK.1_1", "name": "Hovedstaden"}]) == [
        {"gid": "DNK.1_1", "name": "Hovedstaden"}
    ]


def test_parse_subdivisions_rejects_entries_with_no_id():
    # Better to fail loudly than to ingest a region slice keyed on None.
    try:
        parse_subdivisions([{"name": "Nowhere"}])
    except ValueError as err:
        assert "id" in str(err)
    else:
        raise AssertionError("expected a missing id to raise")


def test_parse_subdivisions_is_deterministic():
    payload = [{"id": "FIN.2_1", "name": "B"}, {"id": "FIN.1_1", "name": "A"}]
    assert [r["gid"] for r in parse_subdivisions(payload)] == ["FIN.1_1", "FIN.2_1"]


def test_sweden_round_trips_through_the_parser():
    payload = [{"id": c["gid"], "name": c["name"]} for c in SWEDISH_COUNTIES]
    assert parse_subdivisions(payload) == sorted(SWEDISH_COUNTIES, key=lambda c: c["gid"])
