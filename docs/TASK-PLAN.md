# Nearby (nearlife) — Task Plan

> The delivery backlog for building Nearby, derived from the design docs in this folder.
> Structured **Epic → Feature → Story → Task**. Every task is independently committable and
> carries acceptance criteria so "done" is unambiguous.
>
> Source of truth for *what* to build: [VISION](VISION.md) · [GDD](GDD.md) ·
> [ECONOMY](ECONOMY.md) · [TSD](TSD.md) · [USER-FLOWS](USER-FLOWS.md) ·
> [DATA-SOURCING-LICENSING](DATA-SOURCING-LICENSING.md) · [PRIVACY-COMPLIANCE](PRIVACY-COMPLIANCE.md).

---

## How to use this document

- **Work top-to-bottom by phase.** Phases are ordered so the cheap, thesis-validating work
  (Phase 1) happens *before* the expensive data/production work (Phase 2). Do not start
  Phase 2 build epics until the Phase 1 decision gate passes.
- **Commit against task IDs.** Reference the task in the commit subject, e.g.
  `T-042: weighted species sampling in notification engine`. Tasks are the unit of commit.
- **A task is done when every acceptance-criteria bullet is true.** If a criterion can't be
  met, split the task or raise it — don't silently mark done.
- **IDs are stable.** Never renumber. New work appends the next free number. Epics `E#`,
  Features `F#.#`, Stories `S#.#.#`, Tasks `T-###` (flat, globally unique).

### Assignee legend

| Assignee | Scope |
|----------|-------|
| **Director** | Admin/human-only actions: paid accounts, legal sign-off, store submission, physical-device & real-user testing, business decisions. Cannot be done by Claude. |
| **Claude** | All build work: code, schema, pipeline, content authoring, wireframe→UI, tests, docs. |
| **Director + Claude** | Claude drafts/prepares; Director reviews, approves, or executes the human step. |

### Phase legend

| Phase | Name | Purpose |
|-------|------|---------|
| **P0** | Foundations | Accounts, repo, tooling, Supabase backbone. Enables everything. |
| **P1** | Validation Prototype | Fake-it Kronoberg slice. Answers "is passive collecting rewarding or hollow?" **Throwaway-tolerant.** |
| **🚦 GATE** | Decision | Go/kill on the thesis. Phase 2 is conditional on passing. |
| **P2** | Production Build | Real data layer + full-fidelity app for a single-region public launch. |
| **P3** | Post-Validation (v2) | Family, region packs, social — only after single-player conversion is proven. |

### Status legend

`TODO` · `IN-PROGRESS` · `BLOCKED` · `DONE` · `CUT`. Default is `TODO`; update in place as work proceeds.

### Size legend

T-shirt sizing (solo cadence, not team story points): **XS** <½ day · **S** ~1 day ·
**M** 2–3 days · **L** ~1 week · **XL** >1 week (should usually be split).

### Dependency notation

`deps: T-003, T-010` means those tasks must be `DONE` first. `—` means no hard dependency.

---

## Epic summary

| Epic | Title | Phase | Assignee-weighted |
|------|-------|-------|-------------------|
| **E1** | Project Foundation & Delivery Infrastructure | P0 | Director + Claude |
| **E2** | Fake-It Validation Prototype (Kronoberg) | P1 | Claude (Director tests) |
| **🚦** | Validation Decision Gate | GATE | Director + Claude |
| **E3** | Species Data & Content Pipeline | P2 | Claude |
| **E4** | Spotted Tier & Almanac | P2 | Claude |
| **E5** | Notification Engine | P2 | Claude |
| **E6** | Caught Tier — Map & Minigames | P2 | Claude |
| **E7** | Helped Tier — Mission | P2 | Claude |
| **E8** | Retention & Engagement | P2 | Claude |
| **E9** | Monetization | P2 | Claude (Director accounts) |
| **E10** | Privacy, Compliance & Account | P2 | Claude + Director |
| **E11** | Launch, Analytics & Ops | P2 | Director + Claude |
| **E12** | Post-Validation Expansion (v2) | P3 | Claude + Director |
| **E13** | Internationalization & Localization | P1→P2 | Claude (Director: translation review) |
| **E14** | Species Photos & Media | P1→P2 | Claude + Director |

---
---

# E1 — Project Foundation & Delivery Infrastructure
**Phase:** P0 · **Goal:** every account exists, the repo builds and ships, and Supabase is
ready to receive schema. Nothing in later epics can start without this.

## F1.1 — Accounts, Licensing & Legal Setup
Human-gated setup. Most of this is Director-only because it requires payment, identity, or a
legal signature. Claude prepares everything that can be prepared.

### S1.1.1 — Developer & service accounts
The paid and free service accounts the stack depends on ([TSD §1](TSD.md)).

- **T-001 · Enroll in Apple Developer Program** — *Director · XS · deps: — · [TSD §1](TSD.md)*
  - Apple Developer account active ($99/yr paid).
  - App Store Connect access confirmed; team ID recorded in a private secrets note.
- **T-002 · Register Google Play Developer account** — *Director · XS · deps: — · [TSD §1](TSD.md)*
  - Play Console account active ($25 one-time paid); identity verification complete.
- **T-003 · Create Supabase project (EU region)** — *Director + Claude · XS · deps: — · [TSD §1](TSD.md), [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - Project created in an **EU region** (data residency); Director owns billing.
  - Project URL + anon/service keys handed to Claude via secrets note (never committed).
- **T-004 · Create RevenueCat account & link store keys** — *Director · S · deps: T-001, T-002 · [ECONOMY](ECONOMY.md), [TSD §1](TSD.md)*
  - RevenueCat project created; App Store + Play billing keys linked.
  - Verified free tier covers projected volume (<$2.5k/mo).
- **T-005 · Create PostHog account (EU-hosted)** — *Director + Claude · XS · deps: — · [TSD §1](TSD.md), [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - EU-hosted instance; IP anonymization enabled; project API key issued.
- **T-006 · Create Expo/EAS account** — *Director · XS · deps: — · [TSD §1](TSD.md)*
  - EAS account active; owner set; access shared for cloud builds (no Mac required).

### S1.1.2 — Data licensing & legal confirmations
The go/no-go items from the licensing and privacy docs. **These gate Phase 2, not Phase 1**
(the prototype uses hand-curated data), but start them early — they have external lead time.

- **T-007 · Obtain written GBIF commercial-use confirmation (filtered subset)** — *Director · M · deps: — · [DATA-SOURCING §1](DATA-SOURCING-LICENSING.md)*
  - Written confirmation that a CC0/CC-BY-only filtered subset may be used in a paid app.
  - Attribution/DOI obligations documented. **Blocks the real data pipeline (E3).**
- **T-008 · Confirm OSM/ODbL attribution & derived-DB obligations** — *Director + Claude · S · deps: — · [DATA-SOURCING §4](DATA-SOURCING-LICENSING.md)*
  - ODbL attribution requirement confirmed; decision recorded on keeping derived habitat DB
    internal vs. ODbL-published.
- **T-009 · Kick off legal review (privacy policy, DPAs, EU residency)** — *Director · M · deps: T-003 · [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - Legal reviewer engaged; scope = privacy policy, processor DPAs (Supabase/RevenueCat/PostHog),
    GDPR-K age-gate, SCC/residency. **Blocks public launch (E11), not prototype.**

## F1.2 — Repository, Tooling & CI/CD

### S1.2.1 — Expo app scaffold
> **Bootstrap note:** T-010, T-011, T-013 landed together in one commit. The pre-push gate
> runs `npm run verify` the instant a `package.json` exists, so scaffolding into a *gated,
> green* state is one atomic unit — splitting it across pushes would deadlock. Quality gate
> wins over one-task-per-push here (per [CLAUDE.md](../CLAUDE.md): "quality over everything").

- **T-010 · Initialize Expo (React Native + TypeScript) app** — *Claude · S · `DONE` · deps: — · [TSD §1](TSD.md)*
  - ✅ Expo SDK 57 app (blank-typescript template), TS strict mode on; branded minimal
    `App.tsx`; `app.json` name/slug/scheme set to Nearby/nearby.
  - Chose the minimal template over the heavy default (which shipped web/CSS-module demo code
    that didn't typecheck clean); router/structure added as screens arrive.
- **T-011 · Configure lint/format/typecheck** — *Claude · XS · `DONE` · deps: T-010*
  - ✅ ESLint (flat, `eslint-config-expo` + `eslint-config-prettier`), Prettier, and
    `tsc --noEmit` (strict) all green; `lint`/`typecheck` scripts in `package.json`.

- **T-012 · Establish repo structure** — *Claude · XS · `DONE` · deps: T-010*
  - ✅ Layout established with purpose stubs: `app/`, `components/`, `lib/`, `supabase/`
    (`pipeline/` created in T-015). Documented in `CONTRIBUTING.md` (setup, commands, structure,
    workflow).

### S1.2.2 — Continuous integration & builds
- **T-013 · CI: lint + typecheck + test (`verify` script)** — *Claude · S · `DONE` · deps: T-011 · [TSD §1](TSD.md)*
  - ✅ `verify` = `lint && typecheck && test` defined; Jest via `jest-expo` + `babel-preset-expo`
    with a passing smoke test. Both the pre-push hook (T-109) and CI now have teeth.
- **T-014 · EAS build profiles (dev / preview / prod)** — *Claude · M · deps: T-006, T-010*
  - `eas.json` with three profiles; a `preview` build installs on a real device.
- **T-015 · Python pipeline CI skeleton (scheduled)** — *Claude · S · `DONE` · deps: T-012 · [TSD §6](TSD.md)*
  - ✅ `pipeline/` skeleton (`run.py` + `tests/` + `requirements.txt`);
    `.github/workflows/pipeline.yml` runs it on a monthly cron + manual dispatch; `ci.yml`
    runs `pytest` on push/PR (pip, not make).
  - Portability fix: the local pre-push hook is JS/TS-only (no `make`/Python needed on
    Windows); pipeline code is gated in CI as the backstop. Real jobs land in E3.

### S1.2.3 — Quality gate & repo governance
The enforced quality gate. **Direct-push-to-main is kept**, with a local pre-push hook as the
authoritative gate and CI on `main` as the backstop (per [CLAUDE.md](../CLAUDE.md); decision:
local hook over PR-merge gate).

- **T-109 · Pre-push quality gate + CI backstop** — *Claude · S · `DONE` · deps: T-012 · [CLAUDE.md](../CLAUDE.md)*
  - Version-controlled git hook at `.githooks/pre-push` runs the quality gate before every
    push; `scripts/setup-hooks.sh` sets `core.hooksPath` (also auto-run via npm `prepare` once
    the app exists). ✅ done.
  - `.github/workflows/ci.yml` runs the same verify pipeline on push to `main` and on PRs as a
    backstop. ✅ done.
  - Both currently no-op the code checks (no `package.json` yet) and **gain teeth automatically**
    when T-011 defines the `verify` npm script (`lint && typecheck && test`). Wiring `verify`
    is part of T-011/T-013.
  - Never bypass the hook with `--no-verify`.

## F1.3 — Supabase Backbone

### S1.3.1 — Migrations & extensions
- **T-016 · Supabase CLI + migrations workflow** — *Claude · S · deps: T-003 · [TSD §3](TSD.md)*
  - `supabase` CLI linked to the project; a no-op migration applies cleanly locally and remote.
  - Migration convention documented (timestamped, reversible where practical).
- **T-017 · Enable PostGIS + pg_cron extensions** — *Claude · XS · deps: T-016 · [TSD §1](TSD.md)*
  - `postgis` and `pg_cron` enabled via migration; verified with a trivial spatial query.
- **T-018 · Base auth configuration** — *Claude · S · deps: T-003 · [TSD §1](TSD.md)*
  - Email + at least one social provider enabled; anonymous read of public content allowed;
    a signed-in test user can be created.

---
---

# E2 — Fake-It Validation Prototype (Kronoberg)
**Phase:** P1 · **Goal:** the single most important epic. A thin, hardcoded, deliberately
throwaway vertical slice that lets ~20–30 real Kronoberg users experience the core loop, so we
can answer **"does passive collecting feel rewarding or hollow?"** ([GDD §9](GDD.md),
[TSD §8](TSD.md)) before spending a line of effort on the real data layer.
**Shortcuts are allowed and expected here** — hardcoded data, no real GPS gating, placeholder art.

## F2.1 — Prototype Content (hand-curated Kronoberg set)

### S2.1.1 — Kronoberg species dataset
- **T-019 · Curate ~50 Kronoberg species** — *Claude · M · `DONE` · deps: — · [TSD §8](TSD.md)*
  - ✅ 55 real species (`lib/species/kronoberg.ts`) across birds/mammals/insects/plants/fish,
    each with category, rarity, and per-month active window; typed schema in
    `lib/species/types.ts`; 7 data-integrity tests in `kronoberg.test.ts`.
- **T-020 · Write card content for each species** — *Claude · L · `DONE` · deps: T-019 · [GDD §3,§5,§6](GDD.md), [USER-FLOWS §4](USER-FLOWS.md)*
  - ✅ `lib/species/content.ts`: fact + when/how + give + protect for all 54 species, plus a
    shared `FOLLOW_LOCAL_LAW` line. `content.test.ts` (6 tests) enforces full coverage, the
    honesty rule (no "right now" claims), and the invasive-risk rule (no "plant/release a
    specific species" in give actions). Prototype content — Director review before public use.
- **T-021 · Prototype imagery** — *Claude · S · deps: T-019 · (absorbed into E14)*
  - Superseded by **E14**: the prototype uses the media schema (T-118) with a category-emoji
    fallback; real license-clear photos + attribution come from T-119. See E14.

## F2.2 — Prototype App Shell

### S2.2.1 — Onboarding (lite, compliance-shaped)
- **T-022 · Welcome + location pre-prompt** — *Claude · S · deps: T-010 · [USER-FLOWS §1](USER-FLOWS.md)*
  - Welcome step; pre-prompt explainer *before* the OS location dialog; while-in-use request.
- **T-023 · GPS-derived hometown confirm (hardcoded resolve → Kronoberg)** — *Claude · S · deps: T-022 · [USER-FLOWS §1](USER-FLOWS.md), [ECONOMY](ECONOMY.md)*
  - Device location resolved once; prototype hardcodes the resolve to Kronoberg and shows a
    confirmation ("can't be changed later"). Coords discarded; only region stored.
  - Location-denied → non-blocking preview mode.
- **T-024 · Notification pre-prompt + first Spotted demo** — *Claude · S · deps: T-023 · [USER-FLOWS §1,§4](USER-FLOWS.md)*
  - Notification pre-prompt; onboarding ends with an immediate first Spotted card so the payoff
    is felt in the first minute.

### S2.2.2 — Almanac & Species Card
- **T-025 · Almanac grid with tier overlays** — *Claude · M · deps: T-020 · [USER-FLOWS §2](USER-FLOWS.md)*
  - Grid of species with ●/◐/◑ tier overlays; greyed = not-yet-Spotted; category filter chips.
  - Empty state ("your almanac is waiting"); loading skeleton.
- **T-026 · Species card** — *Claude · M · deps: T-020 · [USER-FLOWS §4](USER-FLOWS.md)*
  - Card shows fact, when/how trivia, give + protect (both free), depth-tier placeholder row,
    "find it nearby" entry. Not-yet-Spotted state shows silhouette.
- **T-027 · Collection state persistence** — *Claude · S · deps: T-018, T-026*
  - Spotting a species persists to Supabase against the user; survives app restart and reinstall
    (tied to account).

### S2.2.3 — This Week screen
- **T-028 · "Active this week" list** — *Claude · S · deps: T-025 · [USER-FLOWS §3](USER-FLOWS.md), [GDD §7](GDD.md)*
  - Lists species whose hardcoded seasonality is active for the current week; `{NEW}` markers.
  - Works with notifications disabled — proves the app isn't notification-dependent.
- **T-029 · Tap-to-collect from This Week** — *Claude · XS · deps: T-028*
  - Tapping a `{NEW}` species opens its card and marks it Spotted, same as a notification tap.

## F2.3 — Prototype Notifications

### S2.3.1 — Scheduled push
- **T-030 · pg_cron + Edge Function picks a species** — *Claude · M · deps: T-017, T-019 · [TSD §4](TSD.md)*
  - Scheduled Edge Function selects one active-season species (simple weighting ok), dedupes
    against the user's collection.
- **T-031 · Expo push delivery + deep link** — *Claude · M · deps: T-030 · [USER-FLOWS §4](USER-FLOWS.md)*
  - Push arrives on device with honest copy; tapping deep-links straight to that species card
    and marks it Spotted.
- **T-032 · Cadence, quiet hours & prefs** — *Claude · S · deps: T-030 · [TSD §4](TSD.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - Frequency cap + quiet hours honored; all tunable via config without redeploy.

## F2.4 — Prototype Catch Taste

### S2.4.1 — One fake bird-timing minigame
- **T-033 · Timing-ring minigame (bird)** — *Claude · M · deps: T-010 · [GDD §4](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - A 10–20s one-thumb timing minigame ("tap when it dives"); clear success/fail feedback.
- **T-034 · Fake catch flow + 3-free-catch counter** — *Claude · M · deps: T-033 · [ECONOMY](ECONOMY.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - No real GPS gating (prototype). Success marks Caught, shows a contextual protect tip.
  - Free-catch counter decrements; 4th attempt shows the gentle "unlimited with Full Game" sheet
    (no real purchase in prototype). Lets us test the whole three-tier feel, not just Spotted.

## F2.5 — Validation Instrumentation & Test

### S2.5.1 — Analytics & criteria
- **T-035 · PostHog event instrumentation** — *Claude · S · deps: T-005, T-031 · [TSD §8](TSD.md)*
  - Events: notification delivered/opened, species spotted, catch attempted/succeeded, session
    start, This Week opened. Day-1/3/7 retention derivable.
- **T-036 · Write go/kill criteria (before testing)** — *Claude + Director · S · deps: — · [GDD §9](GDD.md)*
  - A short criteria doc committed **before** recruiting users: explicit numeric + qualitative
    thresholds for go vs. kill (e.g. sustained notification-open rate floor, "would you be
    disappointed if this went away?" signal). Director approves.
- **T-037 · Validation funnel dashboard** — *Claude · S · deps: T-035*
  - PostHog dashboard showing the onboarding→spot→return funnel and day-7 open rate.

### S2.5.2 — Real-user test
- **T-038 · Recruit 20–30 Kronoberg testers** — *Director · M · deps: T-036*
  - 20–30 real local testers enrolled with a channel for qualitative feedback.
- **T-039 · Run prototype test in the spring window** — *Director · L · deps: T-034, T-037, T-038 · [GDD §9](GDD.md)*
  - Test runs Apr–Jun (naturally species-rich); daily notifications live; interviews collected.
  - **Note:** treat n≈25 qualitatively — behavior + interviews outweigh the percentage.
- **T-040 · Synthesize results into a go/kill recommendation** — *Claude + Director · M · deps: T-039*
  - Written synthesis vs. the T-036 criteria; recommendation feeds the gate below.

---

# 🚦 Validation Decision Gate
**Phase:** GATE · Not an epic — a hard stop. **No Phase 2 epic may start until this passes.**

- **T-041 · Go/kill decision on the passive-collecting thesis** — *Director · XS · deps: T-040 · [GDD §9](GDD.md)*
  - Director records the decision (GO / ITERATE / KILL) with reasoning against T-036 criteria.
  - **GO** → Phase 2 begins. **ITERATE** → loop selected E2 tasks and re-test. **KILL** → stop;
    the thesis failed and no engineering saves it (per [GDD §9](GDD.md)).

---
---

# E3 — Species Data & Content Pipeline
**Phase:** P2 · **Goal:** replace the hardcoded prototype data with a real, licensed,
spatially-indexed data layer for Kronoberg. **Gated by T-007 (GBIF confirmation).**

## F3.1 — GBIF Occurrence Ingestion

### S3.1.1 — Occurrence → probability pipeline
- **T-042 · GBIF ingest with CC0/CC-BY filter** — *Claude · L · deps: T-007, T-015 · [DATA-SOURCING §1](DATA-SOURCING-LICENSING.md), [TSD §6](TSD.md)*
  - Python job pulls Kronoberg occurrences; **excludes CC-BY-NC**; captures dataset DOIs.
  - A test asserts no NC-licensed records survive the filter.
- **T-043 · H3 cell aggregation (res 7–8)** — *Claude · M · deps: T-042 · [TSD §3](TSD.md)*
  - Occurrences aggregated into H3 cells at chosen resolution; cell geometry stored.
- **T-044 · Per-cell per-month presence probability** — *Claude · L · deps: T-043 · [TSD §4](TSD.md)*
  - Compute `cell_species_month.probability` with an honest model; document the
    occurrence≠presence caveat and how copy stays honest ([TSD §7](TSD.md)).
- **T-045 · Upsert into Supabase + attribution capture** — *Claude · M · deps: T-044, T-050 · [TSD §6](TSD.md), [DATA-SOURCING](DATA-SOURCING-LICENSING.md)*
  - Pipeline upserts `cell_species_month`; GBIF/DOI attribution stored for display.
  - Idempotent re-runs; scheduled monthly + at season transitions.

## F3.2 — OSM Habitat & Catch Spots

### S3.2.1 — Habitat classification
- **T-046 · Overpass ingest → habitat_types via osm_tag_rules** — *Claude · L · deps: T-008, T-015 · [TSD §5](TSD.md), [DATA-SOURCING §4](DATA-SOURCING-LICENSING.md)*
  - OSM features pulled via Overpass and classified into habitat types by tag rules.
  - "© OpenStreetMap contributors" attribution recorded for display.
- **T-047 · species_habitat mapping** — *Claude · M · deps: T-046 · [TSD §3](TSD.md)*
  - Each catchable species mapped to the habitat types it's plausibly caught in.

### S3.2.2 — Catch-spot generation & safety
- **T-048 · Generate catch_spots on public/accessible land** — *Claude · L · deps: T-046 · [TSD §5](TSD.md)*
  - `catch_spots` generated only on public/accessible land, snapped to habitat.
- **T-049 · Hard safety exclusions** — *Claude · M · deps: T-048 · [TSD §5](TSD.md), [GDD §4](GDD.md)*
  - Private property, roads/rail, water hazards, protected reserves excluded via `safety_flags`;
    a flagged spot is **never** surfaced. Tests cover each exclusion class.
- **T-050 · Catch-spot density audit (Kronoberg)** — *Claude · M · deps: T-048 · [review finding]*
  - Report: what % of Kronoberg residents have a catch spot within a ~15-min walk. If low,
    flag that Caught skews to a car feature and record the design implication before launch.

## F3.3 — Production Content Authoring

### S3.3.1 — Full species content
- **T-051 · Author Tier-1 fact + trivia + when/how (full set)** — *Claude · XL · deps: T-042 · [GDD §3,§6](GDD.md)*
  - Every launch species has a fact, trivia, and honest "when & how to see it" line.
- **T-052 · Author give/protect (safe defaults + follow-law line)** — *Claude · XL · deps: T-051 · [GDD §5](GDD.md)*
  - Give + protect per species; universally safe actions; standing "follow local law" line;
    threat framing where it adds value; **no risky plant/release specifics**.
- **T-053 · Author depth tiers 2–5** — *Claude · XL · deps: T-051 · [GDD §8](GDD.md), [ECONOMY](ECONOMY.md)*
  - 5 depth levels of trivia/lore/audio/deep-dive per species (climb-by-play / unlock content).
- **T-054 · Regional invasive-check for any plant/release advice** — *Claude + Director · M · deps: T-052 · [GDD §5](GDD.md), [TSD §7](TSD.md)*
  - Any advice naming a species to plant/release is checked against Kronoberg invasives; risky
    items removed or genericized. Director confirms the review pass.

---
---

# E4 — Spotted Tier & Almanac (production)
**Phase:** P2 · **Goal:** the frictionless core — production-grade collection, almanac, and
species card backed by the real data model. Supersedes the E2 prototype screens.

## F4.1 — Production Data Model
- **T-055 · species & species_content tables + RLS** — *Claude · M · deps: T-016 · [TSD §3](TSD.md)*
  - Tables per [TSD §3](TSD.md); Tier-1 + all give/protect flagged always-free; row-level
    security so users read public content and write only their own state.
- **T-056 · collection table + RLS** — *Claude · S · deps: T-055, T-018 · [TSD §3](TSD.md)*
  - `collection` with spotted/caught/helped timestamps, `prime_bonus`, `tier_reached`; RLS to owner.
  - `owner_id` shaped to accept user-or-household later (v2) without migration pain.

## F4.2 — Almanac
- **T-057 · Almanac grid (production)** — *Claude · M · deps: T-056 · [USER-FLOWS §2](USER-FLOWS.md)*
  - Real data grid with ●/◐/◑ overlays, category chips, season/habitat secondary filters.
- **T-058 · Almanac states & progress summary** — *Claude · S · deps: T-057 · [USER-FLOWS §2](USER-FLOWS.md)*
  - 3-tier progress summary (Spotted/Caught/Helped counts); empty + loading states; entry points
    to Badges, Impact, This Week.

## F4.3 — Species Card
- **T-059 · Species card (production)** — *Claude · M · deps: T-055 · [USER-FLOWS §4](USER-FLOWS.md)*
  - Full card: fact, when/how, give/protect (always free), depth row, "find it nearby" entry,
    share. Honest copy enforced.
- **T-060 · Depth-tier climb-by-play logic** — *Claude · M · deps: T-059, T-053 · [GDD §8](GDD.md), [ECONOMY](ECONOMY.md)*
  - Free users unlock depth tiers by playing (spot/catch/help); Full Game unlocks all immediately.
    Progression, not paywall — verified for both states.

---
---

# E5 — Notification Engine (production)
**Phase:** P2 · **Goal:** the heart — a server-side scheduled engine sampling real per-cell
per-month probabilities, honest and fully tunable ([TSD §4](TSD.md)).

## F5.1 — Engine
- **T-061 · Resolve user cell + candidate set (season-gated)** — *Claude · M · deps: T-044, T-056 · [TSD §4](TSD.md)*
  - For each due user, resolve H3 cell and build candidates from `cell_species_month` for the
    current month where `is_active_window` (hard season gate).
- **T-062 · Weighted sampling + dedupe** — *Claude · M · deps: T-061 · [TSD §4](TSD.md)*
  - Weight `w = presence_prob × rarity_flavor`; dedupe against collection; sample one.
  - `rarity_flavor` documented as observation-frequency, phrased honestly in copy.
- **T-063 · Cadence, quiet hours, prefs + delivery logging** — *Claude · M · deps: T-062, T-032 · [TSD §4](TSD.md)*
  - Frequency cap, quiet hours, notif prefs respected; every send logged
    (delivered/opened/collected) for analytics.
- **T-064 · Schedule via pg_cron → Edge Function** — *Claude · S · deps: T-063, T-017 · [TSD §4](TSD.md)*
  - Engine runs on schedule server-side; no client dependency; observable/retryable.

## F5.2 — Honesty & Tuning
- **T-065 · Config-driven tuning levers** — *Claude · S · deps: T-062 · [TSD §4](TSD.md)*
  - Cadence, cell resolution, rarity curve, active-window strictness all config, not hardcoded.
- **T-066 · Copy-rule enforcement** — *Claude · XS · deps: T-059, T-063 · [GDD §3](GDD.md), [USER-FLOWS](USER-FLOWS.md)*
  - Automated check/lint or content review ensuring no string overclaims real-time presence.

---
---

# E6 — Caught Tier — Map & Minigames (production)
**Phase:** P2 · **Goal:** the opt-in active tier that the Full Game sells. Real habitat map,
proximity gating, per-category minigames with genuine game feel, and server-side free-catch
enforcement ([GDD §4](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)).

## F6.1 — Map & Proximity
- **T-067 · MapLibre catch-spot map** — *Claude · M · deps: T-048 · [TSD §1,§5](TSD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - MapLibre map with free tiles shows the user and nearby (public-land) habitat spots for the
    target species; OSM attribution visible.
- **T-068 · Proximity gating & states** — *Claude · M · deps: T-067 · [USER-FLOWS §6](USER-FLOWS.md)*
  - Catch enabled only within range; states for no-spots-nearby, too-far (`[Get closer]`), GPS-off.

## F6.2 — Per-Category Minigames
Each category gets a distinct one-thumb, 10–20s minigame; species within a category reskin the
same mechanic ([GDD §4](GDD.md)).

- **T-069 · Minigame framework + bird (timing)** — *Claude · L · deps: T-033 · [GDD §4](GDD.md)*
  - Shared minigame component contract keyed by `species.category`; bird timing implemented
    (reanimated + gesture-handler, no engine). Graduates the prototype's toy to production.
- **T-070 · Fish minigame (rhythm & tension)** — *Claude · M · deps: T-069 · [GDD §4](GDD.md)*
  - Reel-style; keep the line in the sweet zone. Fair success curve.
- **T-071 · Insect minigame (trace)** — *Claude · M · deps: T-069 · [GDD §4](GDD.md)*
  - Follow the flight path without breaking the line.
- **T-072 · Mammal minigame (stealth)** — *Claude · M · deps: T-069 · [GDD §4](GDD.md)*
  - Advance slowly; freeze when it looks up.
- **T-073 · Plant/fungus minigame (spot & frame)** — *Claude · M · deps: T-069 · [GDD §4](GDD.md)*
  - Find it in the scene and frame it well. No photo required.

## F6.3 — Catch Resolution & Entitlement
- **T-074 · Caught resolution + prime bonus + contextual protect tip** — *Claude · M · deps: T-069, T-052 · [GDD §4,§5](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - Success writes Caught; **prime bonus** if within the active window; the "killer moment"
    contextual protect tip fires in-habitat, in-season.
- **T-075 · Server-side free-catch enforcement (3/season)** — *Claude · M · deps: T-056, T-074 · [ECONOMY](ECONOMY.md), [TSD §5b](TSD.md)*
  - An Edge Function checks `full_game` entitlement OR `free_catches_used < 3` for the current
    `free_catch_season` **before** writing `caught_at`. Client only displays the counter;
    counter resets on season rollover. **Not client-trusted** — verified by test.

---
---

# E7 — Helped Tier — Mission (production)
**Phase:** P2 · **Goal:** the light, honor-system stewardship tier — one tap plus genuinely
useful info, never a chore ([GDD §5](GDD.md), [USER-FLOWS §7](USER-FLOWS.md)).

## F7.1 — Pledge Flow
- **T-076 · Give/Protect pledge screen** — *Claude · M · deps: T-052, T-059 · [USER-FLOWS §7](USER-FLOWS.md)*
  - Choose give or protect; "why it matters" (knowledge-first, never scolding); standing
    "⚖ follow local rules" line; one-tap "I'll do this" → Helped.
- **T-077 · pledges table + impact feed** — *Claude · S · deps: T-076, T-056 · [TSD §3](TSD.md), [GDD §7](GDD.md)*
  - Pledges recorded; feed `impact_counters`. No proof required; no ad or upsell on this moment.

---
---

# E8 — Retention & Engagement
**Phase:** P2 · **Goal:** keep the app alive beyond the passive drip, which saturates
([GDD §7](GDD.md)). The pull surface is the priority lever; the rest layer on.

## F8.1 — This Week (production)
- **T-078 · "Active this week" (production)** — *Claude · M · deps: T-044, T-057 · [USER-FLOWS §3](USER-FLOWS.md), [TSD §4b](TSD.md)*
  - Real query on `cell_species_month`; ordered new-first then rarity; works without
    notifications; quiet-week and location-off states.

## F8.2 — Seasonal & Events
- **T-079 · Seasonal window handling** — *Claude · M · deps: T-044 · [GDD §7](GDD.md)*
  - Migrants only catchable when genuinely passing through; season is a hard constraint.
- **T-080 · Live events** — *Claude · M · deps: T-079 · [GDD §7](GDD.md)*
  - "First swift of spring," salmon run, mushroom bloom — real-calendar events surfaced.

## F8.3 — Impact & Badges
- **T-081 · Collective impact counters** — *Claude · M · deps: T-077 · [GDD §7](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - Community totals ("4,200 nest boxes this spring"); refreshed by cron; shareable.
- **T-082 · Badges & completion** — *Claude · M · deps: T-057 · [GDD §8](GDD.md)*
  - Badges by category, season, habitat, Helped-count; completion tracking in almanac.

---
---

# E9 — Monetization
**Phase:** P2 · **Goal:** the single clean purchase decision — Full Game $9.99, no ads, no
subscription ([ECONOMY](ECONOMY.md)). Free-catch limit is the only conversion nudge.

## F9.1 — RevenueCat & Store
- **T-083 · RevenueCat SDK + entitlement sync** — *Claude · M · deps: T-004, T-056 · [ECONOMY](ECONOMY.md), [TSD §1,§3](TSD.md)*
  - SDK integrated; `entitlements.full_game` mirrored to Supabase; entitlement drives unlocks.
- **T-084 · Full Game product + purchase flow** — *Claude · M · deps: T-083 · [ECONOMY](ECONOMY.md)*
  - $9.99 one-time product purchasable on both stores (sandbox verified); unlocks unlimited
    catching + all depth tiers + full home region.
- **T-085 · Store screen (single SKU, no dark patterns)** — *Claude · S · deps: T-084 · [USER-FLOWS §8](USER-FLOWS.md)*
  - One Full Game card; "you've felt the catch — this makes it unlimited"; "✓ mission always
    free" and "✓ No ads. Ever." reassurance; **no** timers/urgency.
- **T-086 · Restore purchases** — *Claude · XS · deps: T-083 · [USER-FLOWS §8](USER-FLOWS.md)*
  - Restore works across reinstall/devices tied to the account.

## F9.2 — Conversion Funnel
- **T-087 · Out-of-free-catches sheet + funnel analytics** — *Claude · S · deps: T-075, T-085, T-035 · [ECONOMY](ECONOMY.md)*
  - Gentle "3 free catches used — unlimited with Full Game" sheet; PostHog tracks the taste
    funnel (used-all-3 → purchased), the key economy metric.

---
---

# E10 — Privacy, Compliance & Account
**Phase:** P2 · **Goal:** build the GDPR/GDPR-K obligations in as first-class features, not
manual ops ([PRIVACY-COMPLIANCE](PRIVACY-COMPLIANCE.md)). **Blocks public launch.**

## F10.1 — Consent & Age-Gate
- **T-088 · Granular consent (no pre-ticked boxes)** — *Claude · M · deps: T-018 · [PRIVACY §2](PRIVACY-COMPLIANCE.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - Separate opt-ins for location, notifications, analytics; consent state is first-class user
    data; features gate on it. (No ad consent — no ads.)
- **T-089 · Age-gate (GDPR-K, Sweden 13)** — *Claude · S · deps: T-088 · [PRIVACY §3](PRIVACY-COMPLIANCE.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - Birth-year gate; under-threshold routes to a restricted, minimal-data path.

## F10.2 — Location Minimization & Hometown
- **T-090 · Hometown GPS-derive-once + discard coordinates** — *Claude · M · deps: T-088 · [PRIVACY §1](PRIVACY-COMPLIANCE.md), [ECONOMY](ECONOMY.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - Device location resolved once to a region; **coordinates discarded**, only `home_region_id`
    stored; hometown locked (support-only change). No manual picker.
  - Location-denied → preview mode; hometown set on first grant.
- **T-091 · Cell-level location storage only** — *Claude · S · deps: T-090 · [PRIVACY §1](PRIVACY-COMPLIANCE.md), [TSD §3](TSD.md)*
  - Runtime location kept at H3-cell resolution; no precise lat/long trail retained.

## F10.3 — GDPR Rights
- **T-092 · Data export endpoint** — *Claude · M · deps: T-056 · [PRIVACY §2](PRIVACY-COMPLIANCE.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - User can export their data from Settings; reachable anytime.
- **T-093 · Account + data deletion** — *Claude · M · deps: T-056 · [PRIVACY §2](PRIVACY-COMPLIANCE.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - "Delete account & data" fully erases user data (and cascades); build-time feature, not ops.
- **T-094 · Retention policy & auto-expiry** — *Claude · S · deps: T-091 · [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - Defined retention windows for collection/location/analytics; anything not needed auto-expires.

## F10.4 — Legal Artifacts
- **T-095 · Privacy policy + in-app consent copy** — *Claude + Director · M · deps: T-009, T-088 · [PRIVACY](PRIVACY-COMPLIANCE.md)*
  - Claude drafts; Director + legal approve. Linked in-app.
- **T-096 · Processor DPAs + EU residency verified** — *Director · M · deps: T-009 · [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - Signed DPAs and verified EU residency/SCCs for Supabase, RevenueCat, PostHog.

---
---

# E11 — Launch, Analytics & Ops
**Phase:** P2 · **Goal:** ship the single-region public app and be able to see what it's doing.

## F11.1 — Store Submission
- **T-097 · Store listings + assets** — *Claude + Director · M · deps: T-084 · [review]*
  - App name (final, replacing placeholder "Nearby"), descriptions, screenshots, icon; data-safety
    / privacy nutrition labels filled honestly (no ads, minimal data). General-audience category.
- **T-098 · App Store + Play submission & review** — *Director · L · deps: T-095, T-096, T-097, all P2 build epics · [PRIVACY §3](PRIVACY-COMPLIANCE.md)*
  - Builds submitted; review passed; app live in target market.

## F11.2 — Observability
- **T-099 · Production analytics dashboards** — *Claude · S · deps: T-035 · [TSD §8](TSD.md)*
  - Retention, conversion (taste funnel), notification open rate dashboards live.
- **T-100 · Error & pipeline monitoring** — *Claude · S · deps: T-045, T-064*
  - Crash/error reporting on the app; alerting if the data pipeline or notification cron fails.

## F11.3 — Attribution
- **T-101 · Attribution surfaces** — *Claude · XS · deps: T-045, T-046 · [DATA-SOURCING](DATA-SOURCING-LICENSING.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - In-app "GBIF.org + datasets (DOIs)" and "© OpenStreetMap contributors" attribution in
    Settings/About.

---
---

# E12 — Post-Validation Expansion (v2)
**Phase:** P3 · **Goal:** the deferred SKUs and social layer, built only once single-player
conversion is proven. Cut from v1 deliberately ([ECONOMY](ECONOMY.md), [GDD §8](GDD.md)).

## F12.1 — Family SKU & Households
- **T-102 · Households + shared collection model** — *Claude · L · deps: T-056 · [ECONOMY](ECONOMY.md), [TSD §3](TSD.md)*
  - `households`/`household_members`; `collection.owner_id` accepts household; shared
    almanac/Caught/Helped/impact.
- **T-103 · Family SKU + invites** — *Claude + Director · L · deps: T-102, T-083 · [ECONOMY](ECONOMY.md)*
  - ~$19.99 Family entitlement via RevenueCat; member invite flow; parental-consent flow for
    minors ([PRIVACY §3](PRIVACY-COMPLIANCE.md)).
- **T-104 · Family screens** — *Claude · M · deps: T-102 · [USER-FLOWS §7 (v1 note)](USER-FLOWS.md)*
  - Household view, member activity feed, family impact counter; personal/family toggle on Home.

## F12.2 — Regions & World Pass
- **T-105 · Region pack + World Pass products** — *Claude · M · deps: T-083 · [ECONOMY](ECONOMY.md)*
  - $2.99 region packs and $19.99 World Pass; region switcher unlock/lock states in almanac/store.
- **T-106 · New-region onboarding pipeline (repeatable)** — *Claude + Director · L · deps: T-042, T-052 · [ECONOMY](ECONOMY.md)*
  - Repeatable process to open a region: run GBIF/OSM pipeline + light content pass (safe-default
    advice + follow-law) + Director editorial review. Modeled as growth spend.
- **T-107 · Waitlist for unopened home regions** — *Claude · S · deps: T-090 · [review]*
  - Signup from an unopened region → graceful "not in your area yet — join the waitlist" path
    instead of a dead app.

## F12.3 — Social
- **T-108 · Local social layer** — *Claude · L · deps: T-081 · [GDD §7](GDD.md)*
  - Neighborhood/town leaderboards, "what your area caught this week," friend comparisons —
    collecting-vs-your-town, which doesn't saturate like solo collecting.

---
---

## Logic-first tasks (built ahead of their integration tasks)
Pure, unit-tested domain logic in `lib/`, extracted so it can be built and verified through the
quality gate **without** the Supabase/EAS accounts (Director-blocked) or a running simulator.
Each feeds a later integration task (UI wiring / Edge Function) that consumes it unchanged.

- **T-110 · Season & active-window helpers** — *Claude · S · `DONE` · deps: T-019 · [GDD §6](GDD.md), [TSD §4](TSD.md)*
  - ✅ `lib/season.ts`: `monthOf`, `seasonOf`, `seasonKeyOf` (winter spans the year boundary),
    `isActiveInMonth`, `activeSpecies`; 7 tests. Feeds T-111, T-112, T-113.
- **T-111 · "Active this week" selection logic** — *Claude · S · `DONE` · deps: T-110 · [USER-FLOWS §3](USER-FLOWS.md), [TSD §4b](TSD.md)*
  - ✅ `lib/thisWeek.ts`: active species ordered new-to-user first, then rarer-before-common,
    stable tie-break; NEW flag per entry; 5 tests. Consumed by T-028/T-078 UI.
- **T-112 · Notification candidate selection & weighting** — *Claude · S · `DONE` · deps: T-110 · [TSD §4](TSD.md)*
  - ✅ `lib/notification.ts`: season-gate → dedupe → `rarity_flavor` weighting → weighted
    sample with an injected RNG; `candidateSpecies`, `weightFor`, `pickWeighted`,
    `selectNotificationSpecies`; 9 tests. Core of T-030 (prototype) and T-062 (production).
- **T-113 · Free-catch season accounting** — *Claude · S · `DONE` · deps: T-110 · [ECONOMY](ECONOMY.md), [TSD §5b](TSD.md)*
  - ✅ `lib/freeCatch.ts`: `canCatch`/`remainingFreeCatches`/`registerCatch` — 3 free catches
    per season, reset on season rollover, unlimited for Full Game, throws past the limit
    (server guard); 6 tests. The logic the Edge Function in T-075 evaluates (never client-trusted).
- **T-114 · Catch-minigame timing/scoring** — *Claude · S · `DONE` · deps: — · [GDD §4](GDD.md)*
  - ✅ `lib/minigame/timing.ts`: `evaluateTiming` grades a tap (perfect/good/miss) against the
    perfect moment with tunable windows, early/late symmetric; 5 tests. Render-free core of the
    bird timing minigame (T-033 prototype, T-069 framework).
- **T-115 · Collection domain model & progress logic** — *Claude · S · `DONE` · deps: — · [TSD §3](TSD.md), [USER-FLOWS §2](USER-FLOWS.md)*
  - ✅ `lib/collection.ts`: `tierStateOf`/`tierStateFor` (● Spotted ◐ Caught ◑ Helped overlay),
    `progressSummary` (3-tier counts), `spottedIds` (dedupe set for notifications); 6 tests.
    Feeds T-056 (store) and T-057/T-058 (almanac UI).

- **T-116 · Collection store seam (interface + in-memory impl)** — *Claude · S · `DONE` · deps: T-115 · [TSD §3](TSD.md), [USER-FLOWS §4–6](USER-FLOWS.md)*
  - ✅ `lib/collectionStore.ts`: async `CollectionStore` interface + `InMemoryCollectionStore`;
    catch/help implicitly spot; spotted time never overwritten; returns copies; 7 tests.
    Lets the prototype (T-027) run before Supabase; the Supabase store (T-056) implements the
    same interface as a drop-in swap.

**Logic-first coverage:** 10 test suites / 59 tests green across `lib/`. This is the testable
core the Supabase-backed store, Edge Functions, and RN screens will wrap once accounts land.

- **T-117 · First rendered screen: This Week (prototype shell)** — *Claude · S · `DONE`* (partial toward T-028) *· deps: T-111, T-020 · [USER-FLOWS §3](USER-FLOWS.md)*
  - ✅ `components/ThisWeekScreen.tsx` wired into `App.tsx`: renders the real Kronoberg seed
    data via the tested `thisWeek` logic (empty collection → all NEW), with honest "active this
    season" footnote. Typecheck + lint green.
  - ⚠️ **Not visually verified** — no simulator in this environment. Needs a `npm start` device
    run (Director / next session) to confirm layout and rendering. Collection wiring, tap-to-
    collect, navigation, and states remain for T-025/T-027/T-028.

---
---

# E13 — Internationalization & Localization
**Phase:** P1→P2 · **Goal:** ship alpha in **Swedish + English** and be architected for all **24
EU languages** without a rewrite. Retrofitting i18n later is expensive, so the runtime and the
locale-keyed content model go in now. Full design: [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).

## F13.1 — i18n runtime & UI strings
- **T-120 · i18n runtime + typed catalog (en, sv)** — *Claude · S · `DONE` · deps: T-010 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ `lib/i18n/index.ts`: typed `t()`/`createTranslator` with `{name}` interpolation; keys
    derive from the English catalog (missing key → compile error); en → English → key fallback;
    24-locale `Locale` type, `ALPHA_LOCALES`, en + sv catalogs; 7 tests.
- **T-121 · Localize app UI strings** — *Claude · S · `DONE` (This Week; more screens as built) · deps: T-120 · [USER-FLOWS](USER-FLOWS.md)*
  - ✅ `ThisWeekScreen` chrome runs through `createTranslator(locale)` — no hardcoded copy;
    accepts a `locale` prop (device detection in T-123). Species names/content localize in T-122.
    Remaining screens localize as they are built.
- **T-123 · Locale detection & selection** — *Claude · S · `DONE` (detection; Settings override pending Settings screen) · deps: T-120 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ `lib/i18n/resolveLocale.ts` (pure, 4 tests) maps a BCP-47 tag → supported Locale with
    English fallback; `lib/i18n/deviceLocale.ts` reads `expo-localization`; `App.tsx` uses it.
    User override persists once the Settings screen exists (T-009 flow / USER-FLOWS §9).

## F13.2 — Localized species content
- **T-122 · Locale-aware content architecture + Swedish names** — *Claude · M · `DONE` · deps: T-020, T-120 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md), [TSD §3](TSD.md)*
  - ✅ `lib/species/localized.ts`: `commonNameFor`/`contentFor` keyed by locale with English
    fallback; `lib/species/names.sv.ts`: Swedish common names for all 54 species (coverage-tested);
    8 tests. Swedish *content* (fact/when-how/give/protect) is T-127.
- **T-127 · Swedish species content translation** — *Claude + Director · L · deps: T-122 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - Translate fact/when-how/give/protect into Swedish for all 54 species; register `SV_CONTENT`
    in `CONTENT_BY_LOCALE`. Claude first pass → **native review before shipping** (give/protect
    are law-sensitive). Same rule for every subsequent EU language.
- **T-124 · EU locale coverage matrix + status tracking** — *Claude · S · `DONE` · deps: T-122 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ `lib/i18n/coverage.ts`: `LOCALE_STATUS` (missing/machine/reviewed) for all 24 locales;
    `isLiveForUsers`/`liveLocales` (reviewed-only gate), `translationProgress`; 5 tests. en
    reviewed; sv in progress (not live until T-127 + native review). Per-species/field
    granularity can extend this when content translation lands.
- **T-125 · Per-locale review gating + translation ops** — *Director + Claude · M · deps: T-124 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - Translation workflow (MT seed → **native review**, never raw MT for give/protect); a locale
    ships for a country only when reviewed. Per-market rollout order. **Director-gated.**

---
---

# E14 — Species Photos & Media
**Phase:** P1→P2 · **Goal:** every species card has a real hero photo, license-clear with
attribution. Photos are language-independent (one set serves all locales). Licensing:
[DATA-SOURCING-LICENSING.md](DATA-SOURCING-LICENSING.md) §5.

- **T-118 · Media schema + attribution model** — *Claude · S · `DONE` · deps: T-019 · [TSD §3](TSD.md), [DATA-SOURCING §5](DATA-SOURCING-LICENSING.md)*
  - ✅ `lib/species/media.ts`: `SpeciesMedia` type; `isCommercialUseAllowed`/`assertAllowedLicense`
    (only CC0/CC-BY/CC-BY-SA — NC/ND rejected), `attributionFor`, `primaryPhoto`; empty
    `KRONOBERG_MEDIA` manifest (emoji fallback until T-119); 7 tests.
- **T-119 · Source Wikimedia Commons photos (Kronoberg set)** — *Claude + Director · L · deps: T-118 · [DATA-SOURCING §5](DATA-SOURCING-LICENSING.md)*
  - One CC0/CC-BY/CC-BY-SA photo per species, unmodified, with author + license + source URL
    recorded; exclude NC/ND. Director spot-checks licensing. (Needs web sourcing + Supabase
    Storage upload; the prototype can bundle a subset.)
- **T-126 · Species card + almanac render photos** — *Claude · M · deps: T-118, T-119, T-059 · [USER-FLOWS §3,§4](USER-FLOWS.md)*
  - Card hero image and almanac thumbnails use `species_media` with a graceful placeholder;
    per-photo attribution shown on the card / About.

> **T-021 (prototype imagery)** is superseded/absorbed by E14: the prototype uses the media
> schema (T-118) with emoji fallback, and real photos come from T-119.

## Cross-cutting acceptance rules (apply to every UI/content task)
These are global invariants from the design docs; a task that violates one is not `DONE`:

1. **Honest copy** — "active in your region this season," never "here right now"
   ([GDD §3](GDD.md)).
2. **Mission never gated** — Tier-1 fact + all give/protect content free for every species,
   forever ([ECONOMY](ECONOMY.md)).
3. **No ads anywhere** — no ad SDK ships ([ECONOMY](ECONOMY.md), [PRIVACY §4](PRIVACY-COMPLIANCE.md)).
4. **No upsell on delight moments** — collect, catch-success, and help moments stay clean
   ([USER-FLOWS](USER-FLOWS.md)).
5. **Safety first** — catch spots on public/accessible land only; hazards hard-excluded
   ([TSD §5](TSD.md)).
6. **Consent & deletion first-class** — reachable from Settings at all times
   ([PRIVACY](PRIVACY-COMPLIANCE.md)).
7. **No hardcoded user-facing copy** — all strings go through i18n; species names/content are
   per-locale with English fallback ([INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)).
8. **Photos are license-clear + attributed** — CC0/CC-BY/CC-BY-SA, unmodified, credited
   ([DATA-SOURCING §5](DATA-SOURCING-LICENSING.md)).

## Open review items folded in as tasks
From the entrepreneur review, tracked so they aren't lost: written go/kill criteria (**T-036**),
spring-window qualitative testing (**T-039**), catch-spot density audit (**T-050**),
notification-independent pull surface (**T-078**), unopened-region waitlist (**T-107**).

## Estimation note
Sizes here are T-shirt. For per-task story-point estimates, the `sa-toolkit` `/task-estimate`
command can be run against this list.
