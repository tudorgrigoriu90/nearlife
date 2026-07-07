"""Target taxa for the Nearby fauna + flora dataset (nationwide).

Each taxon lists the GBIF backbone name(s) whose occurrences make it up; names are resolved to
taxonKeys at runtime via species/match (EXACT only — see client.resolve_taxon_key). A taxon may
span several GBIF taxa: GBIF's backbone has no single class for ray-finned fish (they sit as
orders under Chordata) and no usable "Reptilia" class (reptiles → Squamata + Testudines), so
those are expressed as unions of the names that DO resolve.

Scale reality: "all fauna + flora" literally is tens of thousands of species (mostly obscure
insects and vascular plants). Two knobs keep the big groups to the *encounterable* core:
  - facetLimit: species (ordered by record count) kept per county-month; hitting it is logged.
  - minOccurrences: drop (county, species) below this many records (the one-off vagrant tail).
Truly-complete rare-species coverage needs the bulk GBIF Occurrence Download API later.
"""

TARGET_TAXA = [
    # Vertebrates.
    {"key": "birds", "names": ["Aves"], "facetLimit": 400, "minOccurrences": 0},
    {"key": "mammals", "names": ["Mammalia"], "facetLimit": 300, "minOccurrences": 0},
    {"key": "amphibians", "names": ["Amphibia"], "facetLimit": 100, "minOccurrences": 0},
    # GBIF backbone: reptiles are Squamata (lizards+snakes, a CLASS there) + Testudines (turtles).
    {"key": "reptiles", "names": ["Squamata", "Testudines"], "facetLimit": 100, "minOccurrences": 0},
    # GBIF backbone has no fish class — target the orders covering Swedish fish.
    {
        "key": "fish",
        "names": [
            "Esociformes", "Cypriniformes", "Perciformes", "Salmoniformes", "Anguilliformes",
            "Gasterosteiformes", "Scorpaeniformes", "Gadiformes", "Petromyzontiformes",
        ],
        "facetLimit": 300,
        "minOccurrences": 0,
    },

    # Invertebrates — large; encounterable core only.
    {"key": "insects", "names": ["Insecta"], "facetLimit": 1000, "minOccurrences": 25},
    {"key": "arachnids", "names": ["Arachnida"], "facetLimit": 500, "minOccurrences": 10},
    {"key": "molluscs", "names": ["Mollusca"], "facetLimit": 500, "minOccurrences": 10},

    # Flora — vascular plants; large and the most law-/invasive-sensitive for give/protect content.
    {"key": "flora", "names": ["Tracheophyta"], "facetLimit": 1000, "minOccurrences": 25},
]
