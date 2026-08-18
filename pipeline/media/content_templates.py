"""Safe, taxon-level give/protect templates + habitat hints for national content (T-135).

These are the *only* auto-generated give/protect content: universally-safe, category-level actions
plus the standing "follow local law" line (applied at the app layer). We deliberately DO NOT
auto-write per-species advice — never "plant/release species X" — because that is how you tell
someone to introduce an invasive (invariant #2, safety; the per-species invasive check is T-054).
All of this is machine/status content and must pass Director + native review before it ships
(T-125/T-135). English source; sv via the review-gated translation pipeline.
"""

# taxon group -> {give, protect, habitat}. habitat feeds the honest "when & how" line.
TEMPLATES: dict[str, dict[str, str]] = {
    "bird": {
        "give": "Put up a nest box suited to local species and keep a clean source of water in summer; keep cats indoors during the nesting season.",
        "protect": "Avoid disturbing nests and nesting sites, keep dogs leashed near ground-nesters, and reduce night lighting and window collisions.",
        "habitat": "in the woods, wetlands, and gardens where it feeds and nests",
    },
    "mammal": {
        "give": "Leave wild corners and hedgerows, a gap in the fence for small mammals to pass, and undisturbed log or leaf piles for shelter.",
        "protect": "Drive carefully at dawn and dusk, keep dogs under control in wildlife areas, and never feed or approach wild mammals.",
        "habitat": "in woodland edges, meadows, wetlands, and quiet cover",
    },
    "insect": {
        "give": "Let part of your lawn grow, plant a variety of pollinator-friendly flowers, and leave leaf litter and deadwood for overwintering.",
        "protect": "Avoid pesticides and insecticides, keep some wild and undisturbed ground, and reduce unnecessary outdoor lighting.",
        "habitat": "around meadows, flowers, and deadwood",
    },
    "arachnid": {
        "give": "Leave undisturbed corners, leaf litter, and deadwood where they hunt and shelter.",
        "protect": "Avoid pesticides, and move rather than harm the ones you find indoors.",
        "habitat": "in undisturbed vegetation, leaf litter, and deadwood",
    },
    "fish": {
        "give": "Help keep waterways clean and shaded with bankside vegetation, and support the removal of barriers so fish can migrate.",
        "protect": "Don't pollute or litter waterways, follow catch-and-release and local fishing rules, and avoid disturbing spawning areas.",
        "habitat": "in the lakes, rivers, and streams where it lives",
    },
    "amphibian": {
        "give": "Keep a pond or a damp, sheltered corner, leave log and stone piles, and maintain safe corridors between water and land.",
        "protect": "Watch for crossings on roads in spring, don't move or handle animals, and keep water free of pollution and litter.",
        "habitat": "near ponds, ditches, and damp ground",
    },
    "reptile": {
        "give": "Leave sunny stone or log piles to bask on and rough, undisturbed ground for shelter.",
        "protect": "Don't handle or move animals, keep dogs on paths in reptile areas, and leave basking spots undisturbed.",
        "habitat": "on sunny banks, heaths, and stone piles",
    },
    "mollusc": {
        "give": "Keep damp, shady refuges like log piles and leave some leaf litter.",
        "protect": "Avoid slug pellets and pesticides, and keep waterways clean for freshwater species.",
        "habitat": "in damp, shady places and clean fresh water",
    },
    "plant": {
        "give": "Let native plants grow, mow less and later in the year, and leave seed heads standing over winter for wildlife.",
        "protect": "Don't pick or dig up wild plants, keep to paths in sensitive areas, and never introduce non-native plants.",
        "habitat": "in the meadows, woods, and verges where it grows",
    },
    "fungus": {
        "give": "Leave deadwood and leaf litter where fungi fruit, and tread lightly in woodland.",
        "protect": "Take only what local rules allow, avoid trampling fruiting bodies, and never rely on an app to judge whether a fungus is edible.",
        "habitat": "on the forest floor, deadwood, and leaf litter",
    },
}

# presence_<stem>.json  ->  template key
TAXON_FROM_FILE: dict[str, str] = {
    "mammals": "mammal",
    "birds": "bird",
    "insects": "insect",
    "arachnids": "arachnid",
    "fish": "fish",
    "amphibians": "amphibian",
    "reptiles": "reptile",
    "molluscs": "mollusc",
    "flora": "plant",
    "fungi": "fungus",
}

_MONTHS = ["January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"]


def months_phrase(active_months: list[int]) -> str:
    """An honest season phrase from 1-indexed active months (never 'here right now')."""
    m = sorted(set(active_months))
    if not m:
        return "at times through the year"
    if len(m) == 12:
        return "year-round"
    # Contiguous run -> "from May to September"; otherwise list the months.
    if m == list(range(m[0], m[-1] + 1)):
        return f"from {_MONTHS[m[0] - 1]} to {_MONTHS[m[-1] - 1]}"
    return "in " + ", ".join(_MONTHS[i - 1] for i in m)


def when_and_how(taxon: str, active_months: list[int]) -> str:
    hint = TEMPLATES.get(taxon, {}).get("habitat", "in its usual habitat")
    return f"Active in your region {months_phrase(active_months)}. Look for it {hint}."
