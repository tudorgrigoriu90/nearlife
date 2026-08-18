"""Per-species habitat realm from GBIF species profiles (T-191).

The habitat half of `whenAndHow` is a taxon template, so every mammal gets the average of a badger
and a seal. GBIF publishes the real answer per species: `/species/{key}/speciesProfiles` carries
`marine`, `freshwater` and `terrestrial` flags.

Profiles arrive from several checklist datasets and disagree with each other. They are **OR-ed
rather than voted on**: a species one authority calls freshwater almost certainly is found in fresh
water, and the costs are asymmetric — a false "aquatic" is a slightly odd hint, while a false
"terrestrial" is telling someone to look for an otter in a meadow, which is the bug this exists to
fix.
"""

REALMS = ("marine", "freshwater", "terrestrial")


def parse_species_profile(payload: dict) -> dict:
    """Combine every profile GBIF holds into one realm map. Absent flags are False, never unknown."""
    combined = {realm: False for realm in REALMS}
    for entry in payload.get("results", []) or []:
        for realm in REALMS:
            if entry.get(realm):
                combined[realm] = True
    return combined


def is_aquatic(realms: dict) -> bool:
    """Water wins when a species is both.

    An otter is terrestrial as well, but the water hint is the one that sends a reader to the right
    place. Absent data is never aquatic — it falls back to the taxon default rather than asserting
    a habitat nobody published.
    """
    return bool(realms.get("marine") or realms.get("freshwater"))
