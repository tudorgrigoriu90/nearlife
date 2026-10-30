"""GADM county ids (what the database uses) → ISO 3166-2 codes (how OpenStreetMap tags each county
boundary, `ISO3166-2=SE-G`). Joined by name, by hand, and pinned by a test: a slipped row would
put one county's spots in another's while looking well-formed."""

ISO_BY_GADM: dict[str, str] = {
    "SWE.1_1": "SE-K",    # Blekinge
    "SWE.2_1": "SE-W",    # Dalarna
    "SWE.3_1": "SE-X",    # Gävleborg
    "SWE.4_1": "SE-I",    # Gotland
    "SWE.5_1": "SE-N",    # Halland
    "SWE.6_1": "SE-Z",    # Jämtland
    "SWE.7_1": "SE-F",    # Jönköping
    "SWE.8_1": "SE-H",    # Kalmar
    "SWE.9_1": "SE-G",    # Kronoberg
    "SWE.10_1": "SE-BD",  # Norrbotten
    "SWE.11_1": "SE-T",   # Örebro
    "SWE.12_1": "SE-E",   # Östergötland
    "SWE.13_1": "SE-M",   # Skåne
    "SWE.14_1": "SE-D",   # Södermanland
    "SWE.15_1": "SE-AB",  # Stockholm
    "SWE.16_1": "SE-C",   # Uppsala
    "SWE.17_1": "SE-S",   # Värmland
    "SWE.18_1": "SE-AC",  # Västerbotten
    "SWE.19_1": "SE-Y",   # Västernorrland
    "SWE.20_1": "SE-U",   # Västmanland
    "SWE.21_1": "SE-O",   # Västra Götaland
}
