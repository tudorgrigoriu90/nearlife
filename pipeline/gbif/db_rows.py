"""Build Supabase rows from the GBIF presence datasets (pure — unit-tested).

Turns the per-taxon presence files (pipeline/data/presence_*.json) into the rows the loader
upserts (pipeline/gbif/supabase_load.py):

  * one `public.species` row per distinct GBIF species, and
  * one `public.species_presence` row per (region, species).

Species ids are ``gbif:<key>`` — stable, and never collide with the curated kebab-case ids.
The taxon → app-`category` map is only for taxa that have a catch minigame (bird/mammal/fish/
insect/plant); the rest keep ``category = None`` and are classified by ``taxon_group`` +
``vertebrate`` (the vertebrate/invertebrate split the app design calls for).
"""

from typing import Iterable, Iterator

# file taxon key → (taxon_group, vertebrate, app category or None)
TAXON_MAP: dict[str, tuple[str, bool, str | None]] = {
    "birds": ("bird", True, "bird"),
    "mammals": ("mammal", True, "mammal"),
    "amphibians": ("amphibian", True, None),
    "reptiles": ("reptile", True, None),
    "fish": ("fish", True, "fish"),
    "insects": ("insect", False, "insect"),
    "arachnids": ("arachnid", False, None),
    "molluscs": ("mollusc", False, None),
    "flora": ("plant", False, "plant"),
}


def species_id_for(gbif_key: int) -> str:
    return f"gbif:{gbif_key}"


def build_rows(datasets: Iterable[tuple[str, Iterable[dict]]]) -> tuple[list[dict], list[dict]]:
    """datasets: iterable of ``(taxon_key, records)`` (records = a presence file's ``records``).

    Returns ``(species_rows, presence_rows)``. A species' ``active_months`` is the union of its
    per-region windows (the honest global "active this season" window); its ``occurrences`` is
    the total across regions (the rarity-flavour input, TSD §4).
    """
    species: dict[str, dict] = {}
    presence: list[dict] = []

    for taxon_key, records in datasets:
        group, vertebrate, category = TAXON_MAP[taxon_key]
        for r in records:
            sid = species_id_for(r["speciesKey"])
            months = list(r["activeMonths"])
            occ = int(r["occurrences"])

            sp = species.get(sid)
            if sp is None:
                species[sid] = {
                    "id": sid,
                    "gbif_key": r["speciesKey"],
                    "scientific_name": r["scientificName"],
                    "common_name": r["scientificName"],  # until localized names are authored
                    "category": category,
                    "rarity": "common",  # rarity_flavor derived from presence.occurrences (TSD §4)
                    "taxon_group": group,
                    "vertebrate": vertebrate,
                    "active_months": set(months),
                    "occurrences": occ,
                }
            else:
                sp["active_months"].update(months)
                sp["occurrences"] += occ

            presence.append(
                {
                    "region_id": r["county"],
                    "species_id": sid,
                    "active_months": sorted(months),
                    "occurrences": occ,
                }
            )

    species_rows = [
        {**sp, "active_months": sorted(sp["active_months"])} for sp in species.values()
    ]
    return species_rows, presence


def region_rows(counties: Iterable[dict]) -> Iterator[dict]:
    """Map the county definitions (gbif/counties.py) to `public.regions` rows."""
    for c in counties:
        yield {"id": c["gid"], "name": c["name"]}
