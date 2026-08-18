# 🌿 Nearby

> **Discover the wild life that shares your world — no hunting, no photos.**
> A passive, notification-driven nature discovery app grounded in real local biodiversity,
> with a genuine environmental mission at its core.

*Working title: **Nearby** (placeholder). Project codename: **nearlife**.*

---

## What it is

You get a gentle push notification when a real species — bird, insect, plant, animal — is
plausibly active in your area this season. Tap it, learn a real fact, and it joins your
personal almanac. An always-available **"Active this week"** screen shows what's around even
if you never enable notifications. Over time you build a living record of everything that
shares your surroundings, whether you ever lay eyes on it or not.

For those who want more, there are two deeper layers — and this is the heart of the design:

| Tier | How you collect it | Feeling |
|------|--------------------|---------|
| **Spotted** | Passive notification → tap | "I know this lives around me" |
| **Caught** | Travel to its real habitat and catch it (a per-category minigame — birds, fish, insects, mammals, plants each play differently) | "I earned this" |
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

One-time premium, no subscription, **no ads — ever**. The freemium experience is anchored to
your **hometown region** — derived from your phone's location at signup, set once: **Free**
(full Spotted tier + 3 catches per season) → **Full Game $9.99** (unlimited catching, all
depth). Other regions are paid packs for travelers; Family, region packs, and World Pass ship
post-validation (v2). Details in [docs/ECONOMY.md](docs/ECONOMY.md).

---

## Run it locally

Works the same on Windows, macOS and Linux. Nothing here needs Xcode or Android Studio — the
fastest path is Expo Go on a physical phone.

**Prerequisites:** Node **≥ 20.19.4** (`node -v`) and Git. On Windows, plain PowerShell is fine;
WSL is not required.

```bash
git clone https://github.com/tudorgrigoriu90/nearlife.git
cd nearlife
npm install
```

**Configure the client keys.** Copy `.env.example` to `.env.local` (git-ignored) and fill in the
two Supabase values from the dashboard → Project Settings → API:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Take the **publishable** key, never a secret one — everything `EXPO_PUBLIC_*` is embedded in the
client bundle by design and protected by RLS, not by being hidden. The PostHog vars are optional;
leave them blank and analytics stays off.

The app also runs with **no `.env.local` at all**: `createRemote()` returns null, the collection
runs purely on-device, and nothing is lost (T-165). That is the quickest way to see the UI.

**Then pick one:**

| | Command | Notes |
|---|---|---|
| Phone (recommended) | `npx expo start --go` | Install **Expo Go**, put the phone on the same Wi-Fi, scan the QR code. Works for iPhone too — the only way to see iOS from a Windows machine. |
| Browser | `npm run web` | Fastest loop. Renders through react-native-web; location and notifications behave differently from a real device. |
| Android emulator | `npm run android` | Needs Android Studio and a running AVD. |

`--go` matters: `expo-dev-client` is a dependency, so a bare `npm start` targets a custom dev build
rather than Expo Go. Push notifications are the one thing Expo Go cannot fully exercise on Android
(SDK 53+) — everything else in the app works.

**If the QR code cannot connect,** it is almost always Windows Firewall blocking Node on the local
network, or the phone being on a different SSID (a 5 GHz/2.4 GHz split counts). `npx expo start
--go --tunnel` routes around both at the cost of some latency.

**Checks before pushing** (the same gate CI runs):

```bash
npm run verify        # lint + typecheck + tests
python -m pytest pipeline -q
```

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
| [PRIVACY-COMPLIANCE](docs/PRIVACY-COMPLIANCE.md) | **Go/no-go:** GDPR, location, kids (ads: none — resolved) |
| [TASK-PLAN](docs/TASK-PLAN.md) | Delivery backlog — epics → features → stories → tasks, phased |

## Scope (v1)

**v1 covers the five Nordic countries — Sweden, Norway, Denmark, Finland and Iceland — showing as
many genuinely encounterable species as possible, fauna and flora, with observation noise
filtered out.** Director decision, 2026-08-11; tracked as **T-167** in
[docs/TASK-PLAN.md](docs/TASK-PLAN.md).

The 54-species Kronoberg set is the **validation prototype** (T-019), not the shipping catalogue.
It did its job — it answered "does passive collecting feel rewarding or hollow?" — and it remains
the quality benchmark for what a card should read like. It was never the ceiling: Kronoberg alone
has 3,018 recorded species, 1,295 of them with more than 100 observations. Birds alone are 357
recorded against 17 in the prototype.

## Status

**Building v1.** The Kronoberg prototype validated the core question:

> Does passive collecting feel *rewarding* or *hollow*?

Work is now on widening the catalogue to the Nordics (T-167) — regional ingest, noise filtering
against each country's authoritative checklist, and content at scale.
