# Nearby — Game Design Document (GDD)

> Design of the experience: the loops, the collection model, the mechanics.
> Money → [ECONOMY.md](ECONOMY.md). Tech → [TSD.md](TSD.md). Screens → [USER-FLOWS.md](USER-FLOWS.md).
> Starting region: **Kronoberg, Sweden.**

---

## 1. Design thesis & north star

Most people are curious about the life around them but never open a naturalist app, because
those apps demand a hunt-and-verify effort first. Nearby removes that barrier: you passively
discover what shares your surroundings, and — if you want — go catch it, learn how to help
it, and pledge not to harm it.

The point is not a trophy shelf. It is a **relationship with local nature** and a nudge
toward caring for it.

**North star:** the meaning serves the fun; it never replaces it. Every mission element is a
door that is always open, never a gate you must pass to play. A player who only wants to
collect must never feel judged for it.

---

## 2. The three-tier collection model *(core differentiator)*

Every species can be collected along three independent axes:

| Tier | How | Friction | Feeling |
|------|-----|----------|---------|
| **Spotted** | Passive push notification; tap to add to almanac | None | "I know this lives around me" |
| **Caught** | Travel to a plausible habitat and complete a light catch action | Medium (opt-in) | "I earned this" |
| **Helped** | Pledge a real action — *give* or *protect* — for the species | Low (honor system) | "This species and I have a relationship" |

The gaps between the counts (e.g. *Spotted 140 / Caught 38 / Helped 12*) are the long-term
motivation. A casual user can live entirely in **Spotted**.

---

## 3. Tier 1 — Spotted (passive)

- Notification fires when a species is **plausibly present** in the user's region for the
  current season (see notification engine in [TSD.md](TSD.md)).
- Tap → fact card → auto-added to almanac. No photo, no proof.
- **Honesty rule:** the claim is "active in your region this season," *not* "here right now."
  Copy must never overclaim real-time presence.

## 4. Tier 2 — Caught (active, opt-in)

- **Catch spots are habitat, not fake GPS spawns.** Species are catchable in the habitat
  where they actually live (water → waterfowl, woodland → woodpeckers, meadow → pollinators),
  derived from OpenStreetMap. This is honest ("this is its kind of place") and teaches real
  ecology as a mechanic — a defensible edge neither Pokémon GO nor iNaturalist has.
- **Catch action is light and species-flavored** — a quick timing/skill minigame, not a
  required photo. (Optional photo-capture is reserved for a future "confirmed sighting"
  hardcore tier — top of the pyramid, not the entry.)
- **Safety & land rights are built into spawn logic from day one:** snap catch spots to
  public/accessible land; hard-exclude private property, protected reserves, roads, water
  hazards. This is a Pokémon-GO lesson, not a patch-later item. (Rules in [TSD.md](TSD.md).)

## 5. Tier 3 — Helped (mission)

Two faces, both honor-system (consistent with the no-proof ethos):

- **Give:** build a swift box, plant natives, leave a fence gap for hedgehogs, let dandelions
  flower, put out water.
- **Protect (restraint):** don't pollute the water, don't litter the shore, don't disturb the
  nest, don't pick the rare flower, keep the dog leashed in nesting season.

**Content rules — get these right or it becomes guilt-noise:**
1. **Specific & threat-driven, not generic.** Not "don't pollute water" but *"this frog
   breathes through its skin — a drop of oil in its pond can kill it."* Threats sourced from
   the **IUCN Red List** (pollution, disturbance, invasives, pesticides, habitat loss).
2. **Positive & knowledge-first, never scolding.** Teach the consequence; let behavior follow.
3. **Seasonal.** "Don't trim the hedge now — birds are nesting." "Late winter is nest-box season."
4. **Framed as a code, not a chore list.** Model on Leave No Trace / the Countryside Code —
   adopting a creed is identity; ticking tasks is homework.
5. **Contextual delivery — the killer moment:** fire protect-guidance *during the catch*, in
   the same habitat, same season: "You're catching a skylark — it nests on the ground here
   through June, keep to the path."

---

## 6. Timing model — trivia & bonus, never a hard gate

Hard time-of-day gates punish casual users; replace them with information + reward.

- **Trivia (always on):** every card carries a "when & how to see it" line — pure value,
  shareable, makes the almanac a real field guide.
- **Optional "good time now" nudges (opt-in):** prime-time alerts for users who want the hook;
  recovers the "reason to open at different times" retention lever without nagging.
- **Bonus, not requirement:** catch any time, but catching during the species' active window
  earns a "prime sighting" badge / special variant / bonus. Reality is a multiplier, never a
  lockout.

**Key distinction:** time-of-day = soft (trivia + bonus). **Season = a real constraint** — a
migrant genuinely isn't here in winter; offering to catch it then would break the illusion.
**Gate the season; only inform the time of day.**

---

## 7. Retention engine

Passive collecting saturates (you fill your local list, then notifications repeat). The engine:

- **Seasonal windows** — migrants only catchable when actually passing through; scarcity
  grounded in reality, not gacha.
- **Live events** — "first swift of spring," salmon run, mushroom bloom. Real events on a real
  calendar; nature supplies the variety for free.
- **Collective impact counters** — "the community put up 4,200 nest boxes this spring." Turns
  solo actions into belonging; highly shareable; directly attacks the retention problem.
- **Local social layer** — neighborhood/town leaderboards, "what your area caught this week,"
  friend comparisons. Collecting vs. your town doesn't saturate the way solo collecting does.

---

## 8. Progression mechanics

- **Depth tiers:** 5 levels of deeper content per species (extra trivia, lore, audio,
  deep-dives). **Climbable by playing** (spot/catch/help) for free users; unlocked immediately
  by the Full Game purchase. A retention/progression mechanic, *not* a paywall — see
  [ECONOMY.md](ECONOMY.md).
- **Badges & completion:** by category (birds, insects, plants…), by season, by habitat, by
  Helped-count.
- **Family shared progression:** in a household, almanac + Caught + Helped are shared — a team,
  not separate players (see [ECONOMY.md](ECONOMY.md) for the Family SKU).

---

## 9. The one unresolved product risk

Does passive collecting feel **rewarding** or **hollow**? This is the thesis, not a footnote.
The Kronoberg fake-it prototype exists to answer it before the data layer is built (validation
plan in [TSD.md](TSD.md) / analytics). If hollow, no amount of engineering saves it; if it
lands, the concept jumps in value.
