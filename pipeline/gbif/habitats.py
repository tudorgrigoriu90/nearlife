"""Which kind of catch spot a species can be met at (T-047): land, freshwater or coast, the three
spot habitats from osm/rules.py.

From the species' GBIF realms (T-191): terrestrial → land, freshwater → freshwater, marine → coast.
A species can have several, like a duck on a lake and its shore. Without realm data, a cautious
default by group: fish only at water, birds anywhere, and the rest on land. Getting a pike wrong
sends someone to a picnic table, which is the failure this whole split exists to prevent.
"""

ORDER = ("land", "freshwater", "coast")
FROM_REALM = {"terrestrial": "land", "freshwater": "freshwater", "marine": "coast"}

DEFAULT_BY_GROUP: dict[str, list[str]] = {
    "fish": ["freshwater", "coast"],
    "amphibian": ["land", "freshwater"],
    "bird": ["land", "freshwater", "coast"],
    "mollusc": ["land", "freshwater", "coast"],
}


def catch_habitats(taxon_group: str, realms: dict | None) -> list[str]:
    found = {FROM_REALM[r] for r, on in (realms or {}).items() if on and r in FROM_REALM}
    if not found:
        return list(DEFAULT_BY_GROUP.get(taxon_group, ["land"]))
    return [h for h in ORDER if h in found]
