# Nearby — Documentation Index

Working title: **Nearby** (placeholder). Project codename: **nearlife**.

Documentation follows the Helix studio taxonomy. Each doc owns one concern; cross-links
avoid duplication.

| Doc | Purpose | Status |
|-----|---------|--------|
| [VISION.md](VISION.md) | The pitch / north star. Why this exists. | Stable (converted from original pitch) |
| [GDD.md](GDD.md) | Game Design Document — core loop, three-tier collection, catch, timing, retention, game systems | Draft |
| [ECONOMY.md](ECONOMY.md) | Economy Design — monetization model (no ads, no subscription), SKU ladder, free-catch taste, progression economy | Draft |
| [TSD.md](TSD.md) | Technical Spec — stack, architecture, data model/schema, notification engine, pipeline | Draft |
| [USER-FLOWS.md](USER-FLOWS.md) | Screen inventory + key user journeys | Outline |
| [TASK-PLAN.md](TASK-PLAN.md) | Delivery backlog — epics/features/stories/tasks, phased, with acceptance criteria | Draft |
| [DATA-SOURCING-LICENSING.md](DATA-SOURCING-LICENSING.md) | **Go/no-go:** API licensing for commercial use | Draft — needs legal verification |
| [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md) | **Go/no-go:** GDPR, location, kids (no ads ship — resolved) | Draft — needs legal verification |

## Governing principles
1. **Cost ≈ $0** at MVP scale — free tiers only (see TSD for the honest cost floor).
2. **Claude builds everything** — mainstream, well-documented, strongly-typed tech.
3. **The mission is free forever** — conservation/help content is never paywalled.
4. **Honesty over hype** — the app claims "active in your region this season," never fake
   real-time presence.

## Recommended reading / build order
1. **DATA-SOURCING-LICENSING** and **PRIVACY-COMPLIANCE** — short go/no-go checks; a bad
   answer here forces a redesign, so resolve on paper first.
2. **TSD** (data model → notification engine) — enough to build the fake-it prototype.
3. **GDD** + **USER-FLOWS** — the loops and screens.
4. **ECONOMY** — layered in after the core loop is validated.

## The one unresolved product risk
Does passive collecting feel *rewarding* or *hollow*? Everything else is execution; this is
the thesis. The Kronoberg fake-it prototype exists to answer it before the data layer is built.
