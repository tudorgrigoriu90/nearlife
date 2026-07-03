# Nearby — Vision & Pitch

> Converted from the original *Elevator Pitch* PDF. This is the north-star / vision doc.
> The working design that supersedes it for build purposes lives in [GDD.md](GDD.md).

**Working title:** Nearby (placeholder — needs a final name)

## The pitch
Nearby is a passive, notification-driven nature discovery app. Instead of hunting for
wildlife or photographing it to "catch" it, you get a push notification when a real species
(animal, bird, insect, plant) is plausibly present in your area right now, based on real
range, habitat, and seasonal data. Tap the notification, learn a few real facts about the
species, and it is added to your personal collection. Over time you build a living almanac of
everything that shares your surroundings — whether you ever physically see it or not.

## The problem
Existing nature-ID apps (Seek, iNaturalist, Merlin Bird ID) all require active effort: go
outside, spot something, photograph or describe it before you learn anything. Great for
dedicated naturalists and citizen scientists, but a barrier for casual curiosity. Most people
who would enjoy learning what lives around them never open these apps, because the apps
demand a hunt first.

Meanwhile, Pokémon GO-style games proved location-based collection is extremely engaging —
but every major clone reskins the loop around fictional creatures. Nobody has applied the
low-friction, ambient version of that loop to real, local biodiversity.

## The solution
- Push notification when a real species is plausibly present nearby (GBIF/eBird-style data).
- Tap to learn a short fact card: habitat, behavior, rarity.
- Auto-collect into a personal library — no photo, no proof required.
- Rarity and completion mechanics: common vs. rare local species, seasonal specials, badges.
- Optional confirm-sighting layer for users who want to log a real encounter later.

## Why this gap exists
Every existing app in this space is built by or with naturalist/conservation institutions
whose mission requires verified data. A no-proof collect mechanic has no scientific value, so
it doesn't fit their purpose. That is the opportunity: a product built purely for engagement
and ambient learning can be simpler and more habit-forming than anything on the market.

## Target user
- Casual nature-curious people who would not open a serious naturalist app
- Parents wanting a low-effort educational habit for kids
- Commuters and urban dwellers who want a reason to notice their surroundings
- Anyone who enjoyed Pokémon GO's core loop but wants it grounded in reality

## Differentiation at a glance
- **Seek / iNaturalist:** photo required, real species, not passive, high scientific value.
- **Pokémon GO-style:** no photo, fictional creatures, not passive, no scientific value.
- **Nearby:** no photo, real species, passive/ambient by design, not aiming for scientific value.

## Evolution beyond the original pitch
Development discussion extended the vision in three important ways (detailed in the GDD):
1. **A "catch" layer** — an optional active tier where you travel to a species' real habitat,
   reintroducing earned reward without losing the frictionless on-ramp.
2. **An environmental mission** — each species teaches how to help it thrive (*give*) and how
   not to harm it (*protect*), turning collection into stewardship.
3. **A three-tier model** — Spotted / Caught / Helped — as the core progression.

## Risks to validate
- Does collecting without confirming presence feel rewarding or hollow? (The core thesis.)
- Data reliability: range data is real but not hyper-local/real-time — cadence and geographic
  granularity need careful tuning.
- Retention: without a go-outside hook, what keeps people opening the app day to day?

## Next step
Scope a lean MVP — species data, notification design, collection UI — targeting a narrow
initial region (**Kronoberg, Sweden**) to validate before expanding.
