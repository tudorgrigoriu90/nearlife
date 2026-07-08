"""The 21 Swedish counties (län) as GBIF GADM level-1 areas.

GIDs are the authoritative keys used to slice GBIF occurrences per county
(`gadmGid=` in the occurrence API). Sourced from GBIF's GADM subdivisions for SWE
(api.gbif.org/v1/geocode/gadm/SWE/subdivisions); names use their Swedish spelling.
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
