"""Target taxa for the Nearby fauna + flora dataset (nationwide).

taxonKeys are resolved from these scientific names at runtime via GBIF's species/match API
(robust — never hardcode keys that can drift).

Scale reality: "all fauna + flora" literally is tens of thousands of species (mostly obscure
insects and vascular plants). A discovery app wants the *encounterable* ones. Two per-taxon
knobs keep the big groups honest and tractable:
  - facetLimit: how many species (ordered by record count) to keep per county-month. Big
    groups get a higher cap; hitting the cap is logged (no silent truncation).
  - minOccurrences: drop (county, species) with fewer than this many records — the long tail
    of one-off vagrants / misidentifications — so we keep species people can actually meet.
Truly-complete rare-species coverage needs the bulk GBIF Occurrence Download API (a GBIF
account), run in GitHub Actions (TSD §6); these search-facet knobs give the encounterable core.
"""

TARGET_TAXA = [
    # Vertebrates — small enough to keep in full.
    {"key": "birds", "scientificName": "Aves", "rank": "CLASS", "facetLimit": 400, "minOccurrences": 0},
    {"key": "mammals", "scientificName": "Mammalia", "rank": "CLASS", "facetLimit": 300, "minOccurrences": 0},
    {"key": "amphibians", "scientificName": "Amphibia", "rank": "CLASS", "facetLimit": 100, "minOccurrences": 0},
    {"key": "reptiles", "scientificName": "Reptilia", "rank": "CLASS", "facetLimit": 100, "minOccurrences": 0},
    {"key": "fish", "scientificName": "Actinopterygii", "rank": "CLASS", "facetLimit": 400, "minOccurrences": 0},

    # Invertebrates — large; keep the encounterable core (Insecta covers dragonflies, butterflies,
    # bees, beetles, etc.; app sub-categorisation by order happens at load time).
    {"key": "insects", "scientificName": "Insecta", "rank": "CLASS", "facetLimit": 1000, "minOccurrences": 25},
    {"key": "arachnids", "scientificName": "Arachnida", "rank": "CLASS", "facetLimit": 500, "minOccurrences": 10},
    {"key": "molluscs", "scientificName": "Mollusca", "rank": "PHYLUM", "facetLimit": 500, "minOccurrences": 10},

    # Flora — vascular plants; large and the most law-/invasive-sensitive for give/protect
    # content (GDD §5), so occurrence data now, content on its own reviewed track.
    {"key": "flora", "scientificName": "Tracheophyta", "rank": "PHYLUM", "facetLimit": 1000, "minOccurrences": 25},
]
