# 🌿 Nearby

> **Discover the wild life that shares your world — no hunting, no photos.**
> A passive, notification-driven nature discovery app grounded in real local biodiversity,
> with a genuine environmental mission at its core.

*Working title: **Nearby** (placeholder). Project codename: **nearlife**.*

---

## What it is

You get a gentle push notification when a real species — bird, insect, plant, animal — is
plausibly active in your area this season. Tap it, learn a real fact, and it joins your
personal almanac. Over time you build a living record of everything that shares your
surroundings, whether you ever lay eyes on it or not.

For those who want more, there are two deeper layers — and this is the heart of the design:

| Tier | How you collect it | Feeling |
|------|--------------------|---------|
| **Spotted** | Passive notification → tap | "I know this lives around me" |
| **Caught** | Travel to its real habitat and catch it | "I earned this" |
| **Helped** | Pledge to *give* (build a nest box) or *protect* (don't pollute its pond) | "This species and I have a relationship" |

The goal isn't a trophy shelf. It's a relationship with local nature — and a nudge toward
caring for it.

## What makes it different

- **Seek / iNaturalist** need a photo and active effort. **Pokémon GO** uses fictional
  creatures. **Nearby** is passive, uses *real* species, and teaches you to care for them.
- **Habitat-anchored catching** (from OpenStreetMap) teaches real ecology — you learn *where*
  things live by playing.
- **A mission that's free forever** — every species tells you how to help it thrive and how
  not to harm it, sourced from real threat data.

## Guiding principles

1. **Cost ≈ $0** at MVP scale — free tiers only.
2. **The mission is free forever** — conservation content is never paywalled.
3. **Honesty over hype** — "active in your region this season," never fake real-time presence.
4. **The meaning serves the fun** — mission elements are always a door, never a gate.

## Tech stack (at a glance)

Expo (React Native) + TypeScript · Supabase (Postgres + PostGIS) · H3 spatial indexing ·
MapLibre · Python data pipeline (GitHub Actions) · RevenueCat. All $0 at MVP scale —
see [docs/TSD.md](docs/TSD.md).

## Monetization

One-time premium, no subscription: **Free** (ad-supported) → **Full Game $9.99** → **Family
$19.99**, plus region packs as DLC. Details in [docs/ECONOMY.md](docs/ECONOMY.md).

---

## 📚 Documentation

Docs follow the Helix studio taxonomy. Start with the index: **[docs/README.md](docs/README.md)**.

| Doc | Purpose |
|-----|---------|
| [VISION](docs/VISION.md) | The pitch / north star |
| [GDD](docs/GDD.md) | Game design — loops, three-tier model, catch, retention |
| [ECONOMY](docs/ECONOMY.md) | Monetization & progression economy |
| [TSD](docs/TSD.md) | Tech stack, data schema, notification engine |
| [USER-FLOWS](docs/USER-FLOWS.md) | Screen wireframes & journeys |
| [DATA-SOURCING-LICENSING](docs/DATA-SOURCING-LICENSING.md) | **Go/no-go:** API licensing |
| [PRIVACY-COMPLIANCE](docs/PRIVACY-COMPLIANCE.md) | **Go/no-go:** GDPR, location, kids, ads |

## Status

**Design phase.** Documentation is being finalized ahead of a lean MVP targeting a single
region — **Kronoberg, Sweden** — to validate the core question before building the data layer:

> Does passive collecting feel *rewarding* or *hollow*?

That thesis is what the first prototype exists to answer.
