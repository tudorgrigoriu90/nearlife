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

from gbif.counties import NORDIC_COUNTRIES
from gbif.habitats import catch_habitats

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


def build_rows(
    datasets: Iterable[tuple[str, Iterable[dict]]],
    vernacular: dict | None = None,
) -> tuple[list[dict], list[dict]]:
    """datasets: iterable of ``(taxon_key, records)`` (records = a presence file's ``records``).

    ``vernacular`` is build_vernacular.py's ``names`` map (``{str(gbif_key): {locale: name}}``).
    Its English name becomes ``species.common_name`` — the base name the app falls back to when a
    locale has none (T-210). Without it the column stays null, never the binomial (T-187).

    Returns ``(species_rows, presence_rows)``. A species' ``active_months`` is the union of its
    per-region windows (the honest global "active this season" window); its ``occurrences`` is
    the total across regions (the rarity-flavour input, TSD §4).
    """
    species: dict[str, dict] = {}
    presence: list[dict] = []
    vernacular = vernacular or {}

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
                    # Null, never a copy of the binomial: the app then knows it has no common
                    # name and can render the scientific one *as* a scientific name, instead of
                    # presenting "Lutra lutra" as what people call an otter (T-187).
                    "common_name": vernacular.get(str(r["speciesKey"]), {}).get("en"),
                    "category": category,
                    "rarity": "common",  # rarity_flavor derived from presence.occurrences (TSD §4)
                    "taxon_group": group,
                    "vertebrate": vertebrate,
                    "active_months": set(months),
                    "occurrences": occ,
                    # Which catch spots it can be met at (T-047), from its GBIF realms (T-191).
                    "catch_habitats": catch_habitats(
                        group, vernacular.get(str(r["speciesKey"]), {}).get("_realms")
                    ),
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


# Presence files are `presence_<taxon>.json` for Sweden and `presence_<taxon>_<ISO3>.json` for the
# other Nordic countries (T-167), so the loader's taxon lookup has to strip the country back off.
_ISO3 = {c["iso3"] for c in NORDIC_COUNTRIES}


def taxon_key_for(stem: str) -> str:
    """`birds` → birds, `birds_NOR` → birds. Raises on a suffix we never wrote."""
    head, sep, tail = stem.rpartition("_")
    if sep and tail.isupper():
        if tail not in _ISO3:
            raise KeyError(f"unknown country suffix in presence file: {stem}")
        return head
    return stem


def regions_from_records(
    datasets: Iterable[tuple[str, Iterable[dict]]],
) -> Iterator[dict]:
    """Derive `public.regions` rows from the presence data itself.

    Every presence row carries a foreign key to `regions`, so the loader must insert a region for
    each id the ingest actually produced. Reading them off the records rather than a checked-in
    country list is what makes the loader country-agnostic: a Norwegian ingest brings its own
    regions with it, and no presence row can reference a region that was never inserted.
    """
    names: dict[str, str] = {}
    for _taxon, records in datasets:
        for r in records:
            gid = r["county"]
            # The ingest falls back to the gid when it has no name; never let that overwrite a
            # real one from another file.
            name = r.get("countyName") or gid
            if gid not in names or names[gid] == gid:
                names[gid] = name
    for gid in sorted(names):
        yield {"id": gid, "name": names[gid]}


def adopt_existing_ids(
    species_rows: list[dict],
    presence_rows: list[dict],
    id_by_gbif_key: dict[int, str],
) -> tuple[list[dict], list[dict]]:
    """Rewrite GBIF-minted ids to the id that already owns that gbif_key.

    The curated species and the GBIF catalogue are the same animals arriving by different routes:
    `great-tit` already holds gbif_key 9705453, so inserting `gbif:9705453` for *Parus major*
    violates the unique index on species.gbif_key and rolls back the whole load — after the ingest
    that produced it has already run for hours.

    The curated id wins because everything else is keyed to it: 38 locales of hand-written content
    and the photos in Storage. The GBIF row carries the taxonomy and presence, which the upsert
    merges onto the existing row instead of creating a second one.
    """
    if not id_by_gbif_key:
        return species_rows, presence_rows
    remap = {}
    for row in species_rows:
        existing = id_by_gbif_key.get(row.get("gbif_key"))
        if existing and existing != row["id"]:
            remap[row["id"]] = existing
            row["id"] = existing
    for row in presence_rows:
        target = remap.get(row["species_id"])
        if target:
            row["species_id"] = target
    return species_rows, presence_rows
