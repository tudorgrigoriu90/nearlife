"""Nordic regions as GBIF GADM level-1 areas (T-167; Sweden-only until then).

GIDs are the authoritative keys used to slice GBIF occurrences per region
(`gadmGid=` in the occurrence API). Sweden's list is checked in because it is verified and already
in use; the other four countries are **fetched** from
api.gbif.org/v1/geocode/gadm/<ISO3>/subdivisions rather than hardcoded.

That asymmetry is deliberate. A wrong GADM id does not fail — it silently slices occurrences by
the wrong region, or by nothing at all, and the output looks perfectly well-formed. Writing down
codes nobody has verified would be the data equivalent of inventing a species name.
"""

SWEDISH_COUNTIES = [
    {"gid": "SWE.1_1", "name": "Blekinge"},
    {"gid": "SWE.2_1", "name": "Dalarna"},
    {"gid": "SWE.3_1", "name": "Gävleborg"},
    {"gid": "SWE.4_1", "name": "Gotland"},
    {"gid": "SWE.5_1", "name": "Halland"},
    {"gid": "SWE.6_1", "name": "Jämtland"},
    {"gid": "SWE.7_1", "name": "Jönköping"},
    {"gid": "SWE.8_1", "name": "Kalmar"},
    {"gid": "SWE.9_1", "name": "Kronoberg"},
    {"gid": "SWE.10_1", "name": "Norrbotten"},
    {"gid": "SWE.11_1", "name": "Örebro"},
    {"gid": "SWE.12_1", "name": "Östergötland"},
    {"gid": "SWE.13_1", "name": "Skåne"},
    {"gid": "SWE.14_1", "name": "Södermanland"},
    {"gid": "SWE.15_1", "name": "Stockholm"},
    {"gid": "SWE.16_1", "name": "Uppsala"},
    {"gid": "SWE.17_1", "name": "Värmland"},
    {"gid": "SWE.18_1", "name": "Västerbotten"},
    {"gid": "SWE.19_1", "name": "Västernorrland"},
    {"gid": "SWE.20_1", "name": "Västmanland"},
    {"gid": "SWE.21_1", "name": "Västra Götaland"},
]

COUNTY_NAME_BY_GID = {c["gid"]: c["name"] for c in SWEDISH_COUNTIES}


# The five Nordic countries. `iso2` is what /occurrence/search filters on; `iso3` is what the
# /geocode/gadm subdivision endpoint takes. Carrying both stops a caller deriving one from the
# other and getting it wrong for the awkward cases.
NORDIC_COUNTRIES = [
    {"iso3": "SWE", "iso2": "SE", "name": "Sweden"},
    {"iso3": "NOR", "iso2": "NO", "name": "Norway"},
    {"iso3": "DNK", "iso2": "DK", "name": "Denmark"},
    {"iso3": "FIN", "iso2": "FI", "name": "Finland"},
    {"iso3": "ISL", "iso2": "IS", "name": "Iceland"},
]

ISO2_BY_ISO3 = {c["iso3"]: c["iso2"] for c in NORDIC_COUNTRIES}


def country_of(gid: str) -> str:
    """`SWE.9_1` → `SWE`. The GADM id already carries its country, so nothing needs to track it."""
    return gid.split(".", 1)[0]


def parse_subdivisions(payload: list) -> list:
    """GBIF /geocode/gadm/<ISO3>/subdivisions → [{gid, name}], sorted for a stable diff.

    Accepts either the `id` or `gid` spelling: GBIF has used both, and silently returning an empty
    list would make the ingest fetch nothing while reporting success.
    """
    regions = []
    for entry in payload:
        gid = entry.get("id") or entry.get("gid")
        if not gid:
            raise ValueError(f"subdivision entry has no id/gid: {entry!r}")
        regions.append({"gid": gid, "name": entry.get("name") or gid})
    return sorted(regions, key=lambda r: r["gid"])
