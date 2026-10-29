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
- **T-003 · Create Supabase project (EU region)** — *Director + Claude · XS · `DONE` · deps: — · [TSD §1](TSD.md), [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - ✅ Project `subjdoiicfmiimtvlzsg` created (EU region); publishable key wired via `.env.local`
    (git-ignored); connectivity verified (publishable key authenticates for data queries).
  - ⚠️ **Action for Director:** the `sb_secret_...` key was exposed in chat — **rotate it** in
    the dashboard. Not needed by the app (publishable key only); server jobs get a fresh secret
    via a CI secret later.
- **T-004 · Create RevenueCat account & link store keys** — *Director · S · deps: T-001, T-002 · [ECONOMY](ECONOMY.md), [TSD §1](TSD.md)*
  - RevenueCat project created; App Store + Play billing keys linked.
  - Verified free tier covers projected volume (<$2.5k/mo).
- **T-005 · Create PostHog account (EU-hosted)** — *Director + Claude · XS · `DONE` · deps: — · [TSD §1](TSD.md), [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - EU-hosted instance; IP anonymization enabled; project API key issued.
  - ✅ EU Cloud project created (Director-confirmed region); project API key (`phc_…`, a public
    client key by design — same tier as the Supabase publishable key) issued and wired (T-035).
    ⚠️ Director: double-check "Discard client IP data" is enabled in Project Settings → the one
    setting I can't verify remotely.
- **T-006 · Create Expo/EAS account** — *Director · XS · `DONE` · deps: — · [TSD §1](TSD.md)*
  - ✅ EAS project created (`27adb571-a470-4052-bb0f-c2a35fbedb39`); wired into `app.json`
    (`extra.eas.projectId`). Run `eas init --id …` (or it's already set) after `eas login`.

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
- **T-014 · EAS build profiles (dev / preview / prod)** — *Claude · M · `DONE` (profiles; first build pending) · deps: T-006, T-010*
  - ✅ `eas.json` with `development` (dev client), `preview` (internal distributable), and
    `production` (auto-increment, store-ready) profiles + `submit.production`.
  - ⚠️ First build not run yet. To *see* the app now, no build is needed: `npx expo start` →
    open in **Expo Go**. Standalone install → `eas build --profile preview`. **`production` is
    only for store submission** (needs Apple/Google accounts T-001/T-002 + signing).
- **T-015 · Python pipeline CI skeleton (scheduled)** — *Claude · S · `DONE` · deps: T-012 · [TSD §6](TSD.md)*
  - ✅ `pipeline/` skeleton (`run.py` + `tests/` + `requirements.txt`);
    `.github/workflows/pipeline.yml` runs it on a monthly cron + manual dispatch; `ci.yml`
    runs `pytest` on push/PR (pip, not make).
  - Portability fix: the local pre-push hook is JS/TS-only (no `make`/Python needed on
    Windows); pipeline code is gated in CI as the backstop. Real jobs land in E3.

### S1.2.3 — Quality gate & repo governance
The enforced quality gate. **Direct-push-to-main is kept.** **GitHub Actions CI is now the
authoritative gate** (per [CLAUDE.md](../CLAUDE.md)); the local pre-push hook was removed in
**T-142** (slow, easy to leave unconfigured, redundant with CI). Run `npm run verify` locally
before pushing — CI runs after the push and reports (does not block) a red `main`.

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
  - ⚠️ **Fixed in T-130:** the hook shipped non-executable (`100644`), so Git *silently ignored
    it* after a plain `npm install` (the npm `prepare` script only sets `core.hooksPath`; it
    never chmods). The gate only worked if you happened to run `scripts/setup-hooks.sh` by hand.

- **T-130 · Fix: store pre-push hook executable so the gate isn't silently skipped** — *Claude · XS · `DONE` · deps: T-109 · [CLAUDE.md](../CLAUDE.md)*
  - Committed `.githooks/pre-push` with mode `100755` (`git update-index --chmod=+x`). Git
    refuses to run non-executable hooks, so as shipped the "authoritative gate" no-opped on any
    machine where only `npm install` (npm `prepare`) had run — the exact "hook was ignored
    because it's not set as executable" warning. The mode bit is the portable fix: it survives
    checkout on Linux/macOS, and Windows Git runs hooks regardless of the bit. `prepare` is left
    cross-platform (plain `git config`) so `npm install` doesn't require `sh` on Windows.

- **T-142 · Migrate the pre-push quality gate to CI (remove the local hook)** — *Claude · XS · `DONE` · deps: T-109 · [CLAUDE.md](../CLAUDE.md)*
  - Removed `.githooks/pre-push` + `scripts/setup-hooks.sh` and the npm `prepare`
    `core.hooksPath` wiring; unset `core.hooksPath` locally. The hook ran the full `npm run verify`
    on every push (slow) and was easy to leave unconfigured — and it was fully redundant with CI.
  - `.github/workflows/ci.yml` is now the **authoritative** gate (was labelled "backstop"): it
    runs `verify` (lint + typecheck + test) + the Python pipeline on every push to `main` and PR.
  - **Trade-off (documented in CLAUDE.md):** with direct-push-to-main, CI runs *after* the push, so
    it reports/notifies on a red `main` but does not block it. Authors run `npm run verify` locally
    before pushing. Hard prevention would need PRs + a required status check (out of scope for now).

- **T-143 · Component/UI test setup + raise coverage to ≥90%** — *Claude · M · `DONE` · deps: T-013 · [CLAUDE.md](../CLAUDE.md)*
  - ✅ **Root cause fixed:** RN render testing works now. The blocker was RNTL v14 being **async**
    (`await render(...)`) **and** needing the new **`test-renderer`** peer (React 19's replacement
    for the deprecated `react-test-renderer`) — which wasn't installed. Both are now declared in
    devDependencies; tests use `await render()` + the `screen` API (interactions are async too —
    `await fireEvent.press(...)`).
  - ✅ **Coverage 44.98% → 90.91% statements** (lines 91.84%, functions 86.6%, branches 82.6%),
    **737 tests / 67 suites green**. Tests cover every component + a full **App integration flow**
    (onboarding → tabs → species card → catch success → protect tip → pledge; Settings → export →
    Almanac), all 5 minigames' **interaction/scoring** paths (fake-timer tick → result), and the
    Supabase species gateway (production DB reads via a fake client).
  - ✅ **Enforced ratchet:** `jest.config.js` `coverageThreshold` = stmts 90 / lines 90 / funcs 85 /
    branches 80, gated in CI via `npm run verify:ci` (local `verify` stays fast). A real coverage
    regression now fails CI.
  - Note: branches 82.6% / functions 86.6% are below 90% (thresholds set accordingly); statements
    and lines — the headline metrics — are ≥90%. Remaining thin lib infra (supabase.ts client
    factory, posthog.ts, permissions.ts) is side-effect glue exercised at runtime, not unit-tested.
- **T-147 · De-flake the AlmanacScreen render test** — *Claude · XS · `DONE` · deps: T-143 · [CLAUDE.md](../CLAUDE.md)*
  - ✅ `components/AlmanacScreen.test.tsx` "renders the grid…" rendered the full 54-species FlatList
    under jest's 5000ms default: ~420ms in isolation but a false-red under CPU load (seen twice while
    a clean install saturated the machine). Gave it an explicit 20s budget (mirrors App.test's
    `FLOW_TIMEOUT`) — removes the flake without hiding a genuine hang. Keeps `main`/CI reliably green.
- **T-161 · Test-suite reliability: teardown leak + de-fragilize the Almanac render** — *Claude · S · `DONE` · deps: T-143 · [CLAUDE.md](../CLAUDE.md)*
  - ✅ **Teardown leak.** After the F13.3 merge the suite logged *"a worker process failed to exit
    gracefully"* and Jest hung on teardown, pushing `npm run verify` past 10 min. Root cause:
    `expo-notifications`' import runs a push-token auto-registration side effect
    (`DevicePushTokenAutoRegistration.fx` → `addPushTokenListener`) that leaves an open handle. The
    app uses it in exactly one spot (`lib/permissions.ts`, only `requestPermissionsAsync`). Fix: a
    minimal side-effect-free `__mocks__/expo-notifications.js`, wired via `jest.config.js`
    `moduleNameMapper`. Workers now exit cleanly — chose a real mock over `--forceExit` so a future
    genuine leak still surfaces. Full suite dropped from a >10-min hang to ~65s, clean exit.
  - ✅ **Almanac render.** `AlmanacScreen.test.tsx` rendered the full 54-species FlatList and timed
    out even at T-147's 20s under CPU load — proving a bigger timeout was the wrong medicine. Now it
    renders **one species per category** (all chips exercised, ~0.6s vs ~40s), with the full-set
    logic still covered by `lib/almanac.test.ts`. Supersedes the T-147 timeout bump.

### S1.3.0 — Client wiring
- **T-129 · Supabase client + config** — *Claude · S · `DONE` · deps: T-003 · [TSD §1,§3](TSD.md)*
  - ✅ `lib/supabaseConfig.ts` reads `EXPO_PUBLIC_SUPABASE_URL`/`_PUBLISHABLE_KEY` (throws if
    missing; 3 tests); `lib/supabase.ts` lazily creates the client (publishable key only, RLS-
    governed). `@supabase/supabase-js` + `react-native-url-polyfill` installed.

### S1.3.1 — Migrations & extensions
> **Unblocked (2026-07-05):** the **Supabase connector (MCP)** is now attached, so Claude reaches
> the live project `subjdoiicfmiimtvlzsg` server-side (bypassing the build sandbox's `*.supabase.co`
> network block). Migrations are applied and verified via the connector (`apply_migration`,
> `list_tables`, `execute_sql`), not the local CLI.
- **T-016 · Supabase CLI + migrations workflow** — *Claude · S · `DONE` (via connector) · deps: T-003 · [TSD §3](TSD.md)*
  - ✅ Migration convention: timestamped files in `supabase/migrations/`, idempotent, RLS-on.
    Both migrations (`…000001` profiles+collection, `…000002` extensions) are **applied to the
    live DB** and present in Supabase's migration history. `supabase/README.md` documents apply +
    verify. (Applied through the MCP connector rather than a locally-linked CLI — the sandbox
    still can't reach `*.supabase.co` directly, but the connector runs server-side.)
- **T-017 · Enable PostGIS + pg_cron extensions** — *Claude · XS · `DONE` · deps: T-016 · [TSD §1](TSD.md)*
  - ✅ `postgis` 3.3 (GEOS/PROJ) and `pg_cron` 1.6.4 installed and **verified live**
    (`select postgis_version()` returns; `pg_cron` present). Migration `…000002_extensions.sql`.
- **T-018 · Base auth configuration** — *Claude · S · `IN-PROGRESS` · deps: T-003 · [TSD §1](TSD.md)*
  - ✅ **Email** provider enabled (Director). ⏳ **Anonymous sign-ins** pending — it's a GoTrue
    setting (not a provider card and not exposed to the connector's tools), toggled at
    **Authentication → Sign In / Providers** (`/dashboard/project/subjdoiicfmiimtvlzsg/auth/providers`)
    via the **"Allow anonymous sign-ins"** switch at the top of the page. Recommended for the
    frictionless prototype session (`supabase.auth.signInAnonymously()`); email magic-link is the
    fallback. Client-side auth bootstrap is wired next with T-027.

> **✅ Security finding resolved (2026-07-05):** the pre-existing `SECURITY DEFINER` event-trigger
> function `public.rls_auto_enable()` had `EXECUTE` granted to `anon`/`authenticated` (advisor
> flag). With Director approval, migration `…000001_harden_rls_auto_enable_grants.sql` revoked it
> — now executable only by `postgres`/`service_role`; the auto-RLS behaviour is unaffected (event
> triggers run as owner). Claude flagged rather than silently changed it (didn't create it).

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
- **T-022 · Welcome + location pre-prompt** — *Claude · S · `DONE` · deps: T-010 · [USER-FLOWS §1](USER-FLOWS.md)*
  - ✅ `lib/onboarding.ts` (tested step machine, 3 tests) drives the flow; `components/OnboardingFlow.tsx`
    renders the Welcome step and a location **pre-prompt explainer that shows before the OS
    dialog** (USER-FLOWS §1), then fires a **while-in-use** request via `lib/permissions.ts`
    (`requestForegroundPermissionsAsync`; background location never requested — PRIVACY §1).
    Shared `components/onboarding/OnboardingScaffold.tsx` layout; all copy via i18n. Onboarding
    gates the app shell in `App.tsx`. Later steps auto-advance until implemented (T-023/T-024).
  - ⚠️ **OS permission flow not device-verified** — no simulator here; the flow machine is unit-tested.
- **T-023 · GPS-derived hometown confirm (hardcoded resolve → Kronoberg)** — *Claude · S · `DONE` · deps: T-022 · [USER-FLOWS §1](USER-FLOWS.md), [ECONOMY](ECONOMY.md)*
  - ✅ `lib/hometown.ts` (3 tests): `resolveHometown(coords)` returns **only a `Region`** — coords
    are consumed and never returned/stored (PRIVACY §1); prototype hardcodes Kronoberg. A test
    asserts the result has no `latitude`/`longitude`. `OnboardingFlow` adds a hometown-confirm
    step ("can't be changed later", CTA "Confirm Kronoberg").
  - ✅ Location-denied → the confirm step is skipped and `App.tsx` enters **non-blocking preview
    mode** with a banner; the app stays fully usable.
  - ⚠️ On-device permission/preview behaviour not visually verified.
- **T-024 · Notification pre-prompt + first Spotted demo** — *Claude · S · `DONE` · deps: T-023 · [USER-FLOWS §1,§4](USER-FLOWS.md)*
  - ✅ Notification pre-prompt explainer before the OS dialog (`requestNotificationPermission`,
    expo-notifications); outcome does **not** gate onboarding (the pull surface works without it).
    Onboarding ends on a **first Spotted card**: the most interesting active-this-week species
    (tested `thisWeek` selection, quiet-week fallback) is marked Spotted on entry and shown in a
    full `SpeciesCard` with a "first sighting" badge → "Start exploring".
  - ✅ Shared session collection wired via `components/useCollection.ts` (React glue over the
    tested `InMemoryCollectionStore`, T-116): the first sighting persists into the Almanac and
    card tier. Swaps to the Supabase store (T-056) without screen changes. **S2.2.1 complete.**
  - ⚠️ OS permission flow not device-verified.

### S2.2.2 — Almanac & Species Card
- **T-025 · Almanac grid with tier overlays** — *Claude · M · `DONE` · deps: T-020 · [USER-FLOWS §2](USER-FLOWS.md)*
  - ✅ `lib/almanac.ts` (pure, 7 tests): `almanacEntries` (species + ●/◐/◑ tier overlay + category
    filter), `categoryCounts`, `discoveredCount`. `components/AlmanacScreen.tsx`: 3-column grid,
    category filter chips (i18n `category.*`), greyed silhouette for not-yet-Spotted, progress
    header, empty state ("your almanac is waiting") and loading skeleton. Shared category-emoji
    helper `components/speciesVisual.ts` (ThisWeekScreen refactored onto it).
  - ⚠️ **Not visually verified** — no simulator here; logic is unit-tested, layout needs a device run.
- **T-026 · Species card** — *Claude · M · `DONE` · deps: T-020 · [USER-FLOWS §4](USER-FLOWS.md)*
  - ✅ `components/SpeciesCard.tsx`: fact, when/how, give + protect (both always free, with the
    standing follow-local-law line), depth-tier placeholder row (5 levels; Tier-1 unlocked, 2–5
    climb-by-play per T-053/T-060), "find it nearby" entry. Not-yet-Spotted state shows a
    silhouette while mission content stays free (invariant #2). All chrome via i18n; content via
    `contentFor`. Wired into `App.tsx` (minimal tab shell: This Week ↔ Almanac → card).
  - ⚠️ **Not visually verified** — logic/content are tested; on-device layout needs a run.
- **T-027 · Collection state persistence** — *Claude · S · `IN-PROGRESS` (built + RLS-verified; on-device run + reinstall pending) · deps: T-018, T-026*
  - ✅ `lib/supabaseCollectionStore.ts`: `SupabaseCollectionStore` implements the `CollectionStore`
    seam (drop-in for the in-memory store), reusing the pure `apply*` transitions (extracted to
    `collectionStore.ts`, shared + tested once) and a thin `CollectionGateway` (supabase-js
    adapter). Row mapping + store logic unit-tested against a fake gateway (6 tests). `useCollection`
    persists to Supabase when configured, else falls back to in-memory (graceful offline / tests).
  - ✅ Auth: `ensureAnonymousSession()` (silent `signInAnonymously()`, session persisted in
    AsyncStorage → **survives app restart**); client configured for RN (T-018 anonymous provider on).
  - ✅ **RLS verified live** via the connector: `collection`/`profiles` policies are exactly
    `auth.uid() = user_id` for select/insert/update/delete — a user reads/writes only their own rows.
  - ⚠️ **On-device run pending** (sandbox can't reach `*.supabase.co` and has no simulator) — needs
    `.env.local` (URL + publishable key) on the device. **Reinstall-survival is NOT met by anonymous
    auth** (anonymous users don't survive reinstall/other devices); tracked as **T-133**.
- **T-133 · Link email to an anonymous user (reinstall / cross-device survival)** — *Claude · S · `IN-PROGRESS` (core + seam + Settings entry + screen done + tested; live confirmation-flow verify pending) · deps: T-027 · [PRIVACY §1](PRIVACY-COMPLIANCE.md)*
  - Anonymous sessions survive restarts but not reinstall. Add optional email-linking
    (`updateUser({ email })` / identity linking) so a user can make their collection durable across
    reinstall and devices — the "survives reinstall (tied to account)" half of T-027. Kept optional
    so onboarding stays frictionless (Settings entry point once that screen exists).
  - ✅ `lib/accountLinking.ts`: `linkEmail(gateway, email)` — the tested state machine (valid email →
    signed in → not already linked → link), returning a typed `LinkFailure` for each guard and
    mapping gateway throws to a retryable `link-failed`. `normalizeEmail`/`isValidEmail` catch typos
    before a round-trip. `SupabaseAuthGateway` is the thin `updateUser({ email })` adapter (identity
    linking preserves the same `user.id`, so existing owner-scoped collection rows carry over). 7 tests.
  - ✅ **Settings entry + screen** `components/LinkEmail.tsx` (5 tests): a Settings "Link an email" row
    opens a gateway-injected screen that reads the current identity (shows an already-linked state, no
    input), validates + submits via `linkEmail`, surfaces each typed `LinkFailure` as its own message,
    and confirms "check your email" on success (Supabase sends a confirmation; the link completes when
    the user taps it). i18n en+sv. App wires it with a `SupabaseAuthGateway`.
  - ⏳ Remaining: live confirmation-flow verification on a device (send → tap link → durable account).

### S2.2.3 — This Week screen
- **T-028 · "Active this week" list** — *Claude · S · `DONE` · deps: T-025 · [USER-FLOWS §3](USER-FLOWS.md), [GDD §7](GDD.md)*
  - ✅ `ThisWeekScreen` (from T-117) lists active-this-week species via the tested `thisWeek`
    logic (T-111) with `{NEW}` markers now driven by the real collection (`spottedIds` prop) —
    spotting a species drops its NEW badge. Empty (quiet-week) state included.
  - ✅ Fully self-contained: no notification dependency, proving the app isn't notification-driven.
    Tap-to-collect is T-029. ⚠️ On-device layout not visually verified.
- **T-029 · Tap-to-collect from This Week** — *Claude · XS · `DONE` · deps: T-028*
  - ✅ This Week rows are now `Pressable`; tapping one marks the species Spotted in the shared
    collection and opens its `SpeciesCard` (same effect as a notification tap, USER-FLOWS §4).
    The NEW badge clears on return since the collection updated. **S2.2.2 + S2.2.3 complete.**

## F2.3 — Prototype Notifications

### S2.3.1 — Scheduled push
- **T-030 · pg_cron + Edge Function picks a species** — *Claude · M · deps: T-017, T-019 · [TSD §4](TSD.md)*
  - Scheduled Edge Function selects one active-season species (simple weighting ok), dedupes
    against the user's collection.
- **T-031 · Push delivery + deep link** — *Claude · M · `DONE` (on-device check rides on T-205) · deps: T-030 · [USER-FLOWS §4](USER-FLOWS.md)*
  - Push arrives on device with honest copy; tapping deep-links straight to that species card
    and marks it Spotted.
  - ✅ Delivery is T-201 (direct FCM, honest copy). The tap: `lib/notificationTap.ts` reads the
    species id from the FCM `data` map — under `content.data` or, failing that, the raw
    `trigger.remoteMessage.data` — and only for a plain tap. `onNotificationTap` (lib/permissions.ts)
    also delivers the tap that **cold-launched** the app (only available as the "last response",
    before any listener exists) and clears each handled response so a resume cannot reopen it.
  - ✅ App queues the tapped species and opens it once onboarding is done: marks it Spotted, emits
    `notification_opened` + `species_spotted {source: 'notification'}` (T-035), opens the card over
    Settings/Badges/Impact. A species a catalogue refresh removed just opens the app.
  - ✅ Foreground: a notification handler shows the banner while the app is open — without one a push
    at the user's slot is silently dropped if they happen to be in the app.
- **T-032 · Cadence, quiet hours & prefs** — *Claude · S · deps: T-030 · [TSD §4](TSD.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - Frequency cap + quiet hours honored; all tunable via config without redeploy.

## F2.4 — Prototype Catch Taste

### S2.4.1 — One fake bird-timing minigame
- **T-033 · Timing-ring minigame (bird)** — *Claude · M · `DONE` · deps: T-010 · [GDD §4](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - ✅ `components/minigame/TimingRingMinigame.tsx`: a one-thumb "tap when it dives" game — a ring
    shrinks and loops; the player taps once to line it up with the target ring, within a 12s
    budget. Grading is the tested render-free core (`evaluateTiming`, T-114); the component only
    drives the visual and reports `{ success, result }` with clear perfect/good/miss + caught /
    got-away feedback. Launched from the card's "find it nearby"; success writes Caught (prototype,
    no GPS gating). Free-catch gate + protect tip + paywall wrap it in T-034.
  - ⚠️ Animation/layout not device-verified; the scoring is unit-tested.
- **T-034 · Fake catch flow + 3-free-catch counter** — *Claude · M · `DONE` · deps: T-033 · [ECONOMY](ECONOMY.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - ✅ No GPS gating (prototype): the card's "find it nearby" launches the timing minigame; on
    success the species is marked Caught and a **contextual protect tip** (`components/catch/ProtectTip.tsx`)
    fires — kept clean, **no upsell** on the delight moment (invariant #4).
  - ✅ Free-catch counter via the tested `freeCatch` logic (T-113): 3/season, increments on
    success, shown on the card ("N free catches left this season"). The **4th attempt** opens the
    gentle `FreeCatchSheet` — no purchase (RevenueCat is E9), no dark patterns, with "mission
    always free" / "no ads" reassurance. Full three-tier feel (Spotted → Caught → protect)
    now playable. **S2.4.1 complete.**
  - ⚠️ On-device layout/flow not visually verified; the counter logic + grading are unit-tested.

## F2.5 — Validation Instrumentation & Test

### S2.5.1 — Analytics & criteria
- **T-035 · PostHog event instrumentation** — *Claude · S · `IN-PROGRESS` (wired + call sites instrumented; `notification_opened` emitted since T-031; on-device verify pending) · deps: T-005, T-031 · [TSD §8](TSD.md)*
  - Events: notification delivered/opened, species spotted, catch attempted/succeeded, session
    start, This Week opened. Day-1/3/7 retention derivable.
  - ✅ `lib/posthogConfig.ts` reads `EXPO_PUBLIC_POSTHOG_KEY`/`_HOST` (mirrors `supabaseConfig.ts`;
    host must be the EU Cloud `https://eu.i.posthog.com` for the PRIVACY-COMPLIANCE EU-residency
    commitment). `lib/posthog.ts` lazily builds the `posthog-react-native` client with
    `captureAppLifecycleEvents: false` — the SDK never auto-sends anything; the *only* events it
    ever receives are the ones this app explicitly tracks. `lib/posthogTracker.ts` (`PostHogTracker`,
    2 tests) adapts it to the existing typed `Tracker` seam. `components/useTracker.ts` composes it
    behind `ConsentGatedTracker` (falls back to `NoopTracker` with no config) so nothing reaches
    PostHog before `analytics` consent is granted (invariant #6) — the gate reads consent via a ref
    kept fresh in an effect (not during render, React Compiler-clean).
  - ✅ **Call sites wired in `App.tsx`:** `session_start` (mount), `this_week_opened` (on that tab),
    `species_spotted` (onboarding's first-spot + This Week tap, with `source`), `catch_attempted` /
    `free_catches_exhausted` (`attemptCatch`), `catch_succeeded` (minigame success, grade from the
    timing result). `notification_delivered`/`opened` and `paywall_shown` remain — they need the
    push pipeline (T-031) and the store screen (T-085), which don't exist yet.
  - ⏳ Remaining: set `EXPO_PUBLIC_POSTHOG_KEY`/`_HOST` in the Director's local `.env.local` + EAS
    build secrets (not committed — same handling as the Supabase publishable key), then verify
    events land in the PostHog dashboard from a real device/simulator run.
  - **Test-infra fix (found while testing this):** `process.env = {...original}` (used to restore
    env vars between tests) silently breaks later writes to `EXPO_PUBLIC_*` keys elsewhere in the
    same test file/worker — an Expo env-polyfill quirk, reproduced in isolation. Fixed here and in
    `supabaseConfig.test.ts` by restoring individual keys via `delete` instead of reassigning the
    whole `process.env` object.
- **T-036 · Write go/kill criteria (before testing)** — *Claude + Director · S · `DONE` (draft; Director approval pending) · deps: — · [GDD §9](GDD.md)*
  - ✅ [docs/VALIDATION-CRITERIA.md](VALIDATION-CRITERIA.md): pre-registered GO/ITERATE/KILL bands
    with **two primary metrics** (Sean-Ellis "very disappointed" ≥40%, day-7 return ≥35%) plus
    secondary diagnostics (notification open rate, passive-collect depth, non-notification pull,
    catch taste) and a weighted qualitative rubric (rewarding vs. hollow). n≈25 read as
    directional; each metric maps to a T-035 event. Indexed in docs/README.
  - ⚠️ **Director-gated:** must be reviewed/approved and frozen **before** recruiting testers (T-038).
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
**Phase:** GATE · Not an epic — a hard stop. ✅ **PASSED (GO) — 2026-07-07.** Phase 2 epics are
now unblocked; each Phase-2 task still respects its own `deps:` (several remain blocked on
Director accounts — GBIF T-007, RevenueCat T-004, PostHog T-005, legal T-009).

- **T-041 · Go/kill decision on the passive-collecting thesis** — *Director · XS · `DONE` (GO) · deps: T-040 · [GDD §9](GDD.md)*
  - ✅ **Decision: GO (2026-07-07).** Director (Tudor) records: the passive-collecting loop feels
    **rewarding and educating** — the thesis holds. Phase 2 (real data layer + production app)
    begins. *(Recorded as a Director judgement call ahead of the full spring-window field test —
    T-038/T-039/T-040; the pre-registered criteria in [VALIDATION-CRITERIA.md](VALIDATION-CRITERIA.md)
    remain the yardstick if a formal re-check is run.)*
  - **GO** → Phase 2 begins. **ITERATE** → loop selected E2 tasks and re-test. **KILL** → stop;
    the thesis failed and no engineering saves it (per [GDD §9](GDD.md)).

---
---

# E3 — Species Data & Content Pipeline
**Phase:** P2 · **Goal:** a real, licensed, occurrence-based fauna+flora dataset for **all of
Sweden (21 län)** — nationwide alpha, not just Kronoberg. **Still gated by T-007 (GBIF written
commercial confirmation) before shipping a paid app; and by the reference-data schema + service
key before loading into Supabase.**

## F3.1 — GBIF Occurrence Ingestion

### S3.1.1 — Occurrence → presence pipeline
- **T-042 · GBIF nationwide presence pipeline (CC0/CC-BY filter)** — *Claude · L · `DONE` (data generated; DB load = T-134) · deps: T-015 (T-007 for shipping) · [DATA-SOURCING §1](DATA-SOURCING-LICENSING.md), [TSD §6](TSD.md)*
  - ✅ `pipeline/gbif/`: all **21 counties** (GADM GIDs), EXACT-only taxon resolution,
    license-filtered (`CC0_1_0`/`CC_BY_4_0`; NC/ND excluded) per-county × per-month species
    facets, 429/5xx backoff, pure aggregation. Tests: aggregation, counties, taxa.
  - ✅ **Full nationwide dataset** (`pipeline/data/presence_*.json`): ~11,900 species entries /
    78,530 county records — insects 6,544, flora 3,082, arachnids 844, birds 708, molluscs 400,
    fish 169, mammals 157, amphibians 17, reptiles 15. Per-month presence captures real phenology.
  - ✅ **Correctness fix (scrutiny):** the strict resolver caught "Reptilia" silently resolving
    to Chordata (all vertebrates → garbage 357-"reptile" set); GBIF backbone has no fish class
    and no Reptilia, so reptiles = Squamata+Testudines and fish = the fish orders (multi-name union).
  - **Honest notes:** (1) occurrence ≠ true presence + CC0/CC-BY subset — in metadata, copy stays
    honest. (2) Raw GBIF includes zoo/vagrant/domestic **noise** (leopards, dolphins in "Swedish
    mammals") — a curation pass vs. an authoritative Swedish checklist (Artdatabanken/Dyntaxa) is
    a follow-up before user-facing use (**new T-136**). (3) 22 MB of JSON committed as the interim
    home; canonical home is Supabase (T-134).
- **T-136 · The noise filter, and the catalogue it produces** — *Claude · M · `DONE` · deps: T-042, T-177*
  - ✅ `gbif/noise.py` (12 tests) plus `gbif/catalogue.py` + `build_catalogue.py` (7 tests), which
    **write the verdict down**. Until now the filter was run ad hoc to answer "how many species
    ship?" — making the catalogue something recomputed on demand rather than an artefact nothing
    could read, diff, or argue with.
  - **Live figures** (`data/catalogue.json`, 3.7 MB): **6,824 species ship, carrying 99.63% of all
    observations**; 5,084 filtered out carrying 0.37%.
  - **Exclusions are recorded with their reasons**, not just the survivors. A species dropped
    silently cannot be argued with later, and the excluded list is where a mis-tuned threshold
    becomes visible — if something obviously common appears there, the policy is wrong.
  - 🔎 **What the excluded list actually revealed.** Of 5,084 exclusions, **4,479 are `min_counties`
    — locally restricted, not scarce.** The most-excluded species are things like *Lunaria rediviva*
    (934 records in 2 counties): genuinely common **where they grow**, and invisible nationally. The
    checklist ingest this task originally called for is moot under T-177 (the filter *is* the
    quality bar), but this finding is not — see **T-194**.
- **T-194 · `min_counties` hides species that are common in one place** — *Claude + Director · M · `TODO` · deps: T-136*
  - The filter drops a species recorded in fewer than 3 counties. That is right for a *national*
    catalogue and wrong for the app being built, which is **regional by design** — presence is
    per-county and the copy is "active in your region this season".
  - Concretely: someone standing in the one county where *Lunaria rediviva* grows is told it does
    not exist, while a species thinly spread over 20 counties is offered to them. **4,479 species**
    sit in this category — two-thirds of everything the filter removes.
  - The fix is likely per-region rather than global evaluation: a species qualifies for the counties
    where it clears the occurrence bar, instead of qualifying everywhere or nowhere. That changes
    `species_presence` semantics rather than just a threshold, which is why it is its own task.
  - Not urgent for v1 (the shipped set already carries 99.63% of observations) but it is the
    difference between a national list and a local one, which is what the product claims to be.
- **T-134 · Load presence dataset into Supabase (reference schema + writer)** — *Claude + Director · M · `DONE` (bulk load verified live 2026-10-28) · deps: T-042, T-003 · [TSD §3](TSD.md)*
  - ✅ **Schema** `…000003_regions_and_presence.sql`: `regions` (21 counties), `species` taxonomy
    columns (`gbif_key`, `taxon_group`, `vertebrate`; `category` now nullable for amphibians/
    reptiles/arachnids/molluscs), and `species_presence(region_id, species_id, active_months,
    occurrences)` — all public-read RLS. (Region-level presence is the interim for per-cell
    `cell_species_month`, T-044.)
  - ✅ **Bulk loader** `pipeline/gbif/supabase_load.py` + pure `gbif/db_rows.py` (`build_rows`,
    species deduped with unioned windows + summed occurrences; 3 pytest). Idempotent upsert of
    regions → species → presence via `$SUPABASE_DB_URL` (service role). This is the home for the
    ~12k species / 78.5k presence rows — the pipeline's job, not ad-hoc SQL.
  - ✅ **Bounded alpha seed** `…000004_seed_kronoberg_presence.sql` (from `scripts/gen-kronoberg-presence.ts`):
    links **53/54** curated species to their real Kronoberg (SWE.9_1) GBIF presence
    (`gbif_key`/`taxon_group`/`vertebrate` + `species_presence` rows) — applyable via the connector now.
  - ⏳ **Remaining:** apply the migrations + run the bulk loader with the service key (CI job); then
    switch the app to read presence from the DB (T-057/T-059).
  - ✅ **Done (verified 2026-10-28):** data-pipeline run 40730729091 loaded 21 regions,
    **11,936 species** and **78,530 presence rows**, adopting 53 curated ids (T-184). The app reads
    presence from the database: This Week via `species_presence` (T-207), and the Almanac via
    `region_catalogue` (T-208).
- **T-135 · Curate + author content at national scale** — *Claude + Director · XL · `DONE` (all taxa loaded 2026-10-28) · deps: T-042 · [GDD §5](GDD.md), [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ Pipeline `pipeline/build_content.py` (+ `media/content_templates.py`, 8 pytest) generates, for
    every species in a presence file: a **grounded fact** from Wikipedia (CC BY-SA, attributed —
    never fabricated; `null` when there's no article), an **honest season+habitat "when & how"**
    line templated from the real active-months, and **safe taxon-level give/protect** templates.
    All entries are `status='machine'`, `needsReview=true`, `curationStatus='uncurated'`.
  - ✅ **Hard safety line kept:** give/protect are category templates only — **never** auto-written
    per-species plant/release advice (invariant #2; the per-species invasive check stays T-054).
  - ✅ Validated on **mammals** (`data/content_mammal.json`). Full 12k run is `build_content.py --all`
    (hours — run in CI, not interactively).
  - ⏳ Remaining: run all taxa; **native review** (T-125) + **GBIF-noise curation** (T-136) before it
    ships; load into `species_content` (**T-145** loader — done) and switch the app to DB reads
    (T-057/T-059) so the 12k actually render; sv translation via the review gate.
  - ✅ **Done (verified 2026-10-28):**
    - **All taxa** generated and loaded in run 40730729091: 213,894 `species_content` rows, every
      species in all 18 v1 locales. Per-locale counts are in T-210.
    - The **review gate is superseded** by the Director's v1 scope (T-177): the T-136 noise filter
      is the quality bar, and there is no per-species human verification.
    - Names come from GBIF vernaculars, never machine translation (T-188/T-187), so no sv
      translation step remains.
    - The safety line held: give/protect are still category templates only.
- **T-144 · CI workflow for the national data pipeline** — *Claude · S · `DONE` (workflow; needs Director secrets to load) · deps: T-134, T-135 · [TSD §6](TSD.md)*
  - ✅ `.github/workflows/data-pipeline.yml` (manual `workflow_dispatch`): installs the pipeline deps,
    generates national content (`build_content.py --all` or a chosen taxon) + the curated photo
    manifest, and uploads the generated JSON as an artifact. The **Supabase load** (`gbif.supabase_load`,
    T-134) and **photo upload** (`media/supabase_upload.py`, T-119) steps run only when the repo
    secrets are set — so the whole E3 load runs from GitHub with secrets, not Python on a laptop.
  - ⏳ **Director:** add repo secrets `SUPABASE_DB_URL` (privileged Postgres string),
    `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, then run the workflow. The `species_content` loader
    (content JSON → table) is now built + tested (**T-145**) — running it just needs those secrets.
- **T-145 · Load generated content into `species_content` (loader + tests)** — *Claude · S · `DONE` (code + 5 pytest; bulk run needs the service key) · deps: T-135, T-055 · [TSD §3](TSD.md)*
  - ✅ Pure row-builder `pipeline/gbif/content_rows.py` (`build_content_rows` → species_content upsert
    dicts with `gbif:<key>` ids matching the species loader) + thin loader
    `pipeline/gbif/supabase_load_content.py` (idempotent upsert via privileged `$SUPABASE_DB_URL`),
    mirroring the presence loader (T-045). 5 pytest; full pipeline suite green (31).
  - ✅ **Honest coverage:** only species with a grounded Wikipedia fact become rows (`species_content.fact`
    is NOT NULL and the app treats `fact` as required); fact-less species are counted + reported,
    **never fabricated** (invariant #1). Smoke on `content_mammal.json`: 156/157 rows, 1 skipped.
  - ⏳ Run inside the T-144 workflow **after** the species/presence load (FK order), with the service key.
- **T-146 · Fact-less species surface mission content (nullable fact)** — *Claude · S · `DONE` (Director decision: make `fact` nullable) · deps: T-145 · [GDD §5](GDD.md)*
  - ✅ **Decision (Director):** make `species_content.fact` nullable + render mission-only cards, so
    give/protect stay free for **every** species (invariant #2) even when there's no Wikipedia article
    — a fact is never fabricated (invariant #1).
  - ✅ **Migration** `…20260811000001_species_content_fact_nullable.sql`: `alter column fact drop not
    null` (data-only; no other column/index/RLS touched; idempotent). Director applies via the connector.
  - ✅ **Loader** `gbif/content_rows.py` now writes a row for **every** species — `fact = None` when
    absent (was: skipped) — reporting `with_fact` / `without_fact` honestly. Tests updated.
  - ✅ **App:** `SpeciesContentRow.fact` is `string | null`; `contentRowToContent` maps a DB `NULL` →
    `''`; `SpeciesCard` hides the fact block on empty and still renders give/protect/when-how. New
    tests on the repository mapping + the card. `SpeciesContent.fact` stays `string` (curated content
    + dual-language path untouched).
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
- **T-053 · Author depth tiers 2–5** — *Claude · XL · `DEFERRED` (Director, 2026-08-11 — post-validation) · deps: T-051 · [GDD §8](GDD.md), [ECONOMY](ECONOMY.md)*
  - 5 depth levels of trivia/lore/audio/deep-dive per species (climb-by-play / unlock content).
  - ⏸️ Large content effort with unpinned scope (what fills each level, and at 54 vs 12k scale) and
    no generation pipeline — deferred until post-validation. The depth row stays a locked placeholder;
    the unlock *logic* (T-060) is deferred with it.
- **T-054 · Regional invasive-check for any plant/release advice** — *Claude + Director · M · deps: T-052 · [GDD §5](GDD.md), [TSD §7](TSD.md)*
  - Any advice naming a species to plant/release is checked against Kronoberg invasives; risky
    items removed or genericized. Director confirms the review pass.

---
---

# E4 — Spotted Tier & Almanac (production)
**Phase:** P2 · **Goal:** the frictionless core — production-grade collection, almanac, and
species card backed by the real data model. Supersedes the E2 prototype screens.

## F4.1 — Production Data Model
- **T-055 · species & species_content tables + RLS** — *Claude · M · `DONE` · deps: T-016 · [TSD §3](TSD.md)*
  - ✅ `supabase/migrations/…000001_production_species_tables.sql`, **applied + verified on the live
    DB** (via connector, 2026-07-07): `species` (catalogue) + `species_content` (locale-keyed
    fact/when-how/give/protect, `always_free` default true — invariant #2). RLS: public **read**
    for `anon`+`authenticated` (`using(true)`); writes are service-role only. Security advisor clean.
  - ✅ **Seed:** `scripts/gen-species-seed.ts` generates idempotent upserts from the curated set →
    `…000002_seed_species.sql`. The **54-species catalogue is seeded + verified live** (`count = 54`);
    the full content seed (en+sv) is in the migration file, applied when the app reads from the DB
    (T-057/T-059) or replaced by the GBIF pipeline (E3). Switching the app to DB-reads is next.
  - ℹ️ Advisor note: `collection`/`profiles` show "anonymous access" warnings — **expected by
    design** (anonymous users are our users; policies are owner-scoped `auth.uid() = user_id`).
- **T-056 · collection table + RLS** — *Claude · S · `DONE` · deps: T-055, T-018 · [TSD §3](TSD.md)*
  - ✅ `collection` (spotted/caught/helped timestamps, `helped_kind`, `prime_bonus`) + `profiles`
    live with owner-scoped RLS (migration …000001). Verified end-to-end: the app persists via the
    Supabase store (T-027) — the live table now holds real rows from device runs.
  - ⚠️ `tier_reached` and household-shaped `owner_id` (v2) not yet added — a later migration when
    T-102 (households) lands; the current `user_id` shape covers v1.

## F4.2 — Almanac
- **T-057 · Almanac grid (production)** — *Claude · M · `IN-PROGRESS` (**Supabase repo injected**; season filter done; habitat filter pending) · deps: T-056 · [USER-FLOWS §2](USER-FLOWS.md)*
  - ✅ Data-access seam `lib/speciesRepository.ts` (7 tests): `SpeciesRepository` (`listSpecies` +
    `getContent`) with a `HardcodedSpeciesRepository` (the bundled set the app runs on today) and a
    `SupabaseSpeciesRepository` (reads the seeded `species`/`species_content` tables via a fakeable
    gateway, English content fallback). Grid already renders ●/◐/◑ overlays + category chips (T-025).
  - ✅ **App now loads the Almanac catalogue through the repository** (`App.tsx`, one-shot async load
    on mount → `AlmanacScreen` gets `species` + `loading`), not the bundled module directly. Defaults
    to `HardcodedSpeciesRepository` (no behaviour change); the source swaps to Supabase once the DB is
    seeded. App integration test asserts the loaded total (fails if the async load regresses).
  - ✅ **Injected (2026-08-18).** `createSpeciesRepository()` returns Supabase when configured and
    the bundled data otherwise; `App.tsx` no longer constructs `HardcodedSpeciesRepository` directly.
  - ✅ **Wrapped in `FallbackSpeciesRepository`.** The swap is not a straight substitution: bundled
    data is always available and the network is not, so one failed request would empty the almanac —
    worse than 54 species, and a regression against the offline-first behaviour T-165 established
    for the collection. The fallback triggers on **failure only, never on an empty result**: an
    empty result is an answer, and falling back there would show bundled content for a species the
    database has no row for — or, in `getContentInLocale`, surface a language the user never chose,
    which is the precise thing that method exists to prevent. Failures are logged rather than
    swallowed, because a silent fallback makes a persistent outage look like a small catalogue.
  - ✅ **Season filter (2026-10-29):** a "🗓 Active this month" toggle chip. It combines with the
    category chips and narrows the grid to species whose county `active_months` include the
    current month. It has its own empty state. With 3,000+ species in a county list this is the
    useful cut, and the copy stays honest: "active this month", never "here now" (invariant #1).
    `almanacEntries(…, activeIn)` is tested in `lib/almanac.test.ts`, the chip in
    `AlmanacScreen.test.tsx`.
  - Remaining: **habitat filter.** The data exists only in the pipeline (`_realms` from GBIF
    species profiles, T-191, in `vernacular.json`); no database column carries it yet. It needs
    a `species.realms` column and loader before any UI.
  - 🚦→✅ **The seed gate is CLEARED (2026-08-18).** The gate read: do not inject the Supabase repo
    until all 38 locales are seeded, because `SupabaseSpeciesRepository.getContentInLocale` has no
    English fallback by design — switching over with only en/sv/so live would have silently blanked
    the dual-language secondary half for the other 35 languages, the same class of bug T-160 fixed,
    in reverse. `20260810000001` is now applied (Director, via T-176 `Database migrate`) and
    `species_content` holds **2052 rows = 38 locales × 54 species**. The bundled repository is no
    longer the more complete source, so the swap is now unblocked.
  - 💰 **Storage cost of moving all content to Postgres: negligible.** 2052 rows carry ~761 KiB of
    field text; with names, row overhead and the PK/locale indexes it lands around 1–2 MB against
    the 500 MB free-tier allowance (~0.3%). Invariant #7 holds with a wide margin.
  - Egress is the dimension to watch, not storage: `SupabaseSpeciesGateway.fetchContent` reads a
    single `(species_id, locale)` row per card (~1 KiB), so normal use is trivial against the 5 GB
    monthly allowance. Only a "fetch the whole catalogue on launch" change would matter — at 761 KiB
    per cold start that would be ~6,500 sessions/month, so keep the per-row read.
  - Moving content to the DB also *shrinks* the app bundle: today every user downloads all 38
    languages to read at most two.
- **T-058 · Almanac states & progress summary** — *Claude · S · `DONE` · deps: T-057 · [USER-FLOWS §2](USER-FLOWS.md)*
  - ✅ 3-tier progress summary row (● Spotted / ◐ Caught / ◑ Helped counts via the tested
    `progressSummary`, T-115) added to the Almanac header; empty + loading states already present
    (T-025).
  - ✅ **Entry points** (T-058): a "🏅 Badges" / "🌱 Impact" link row under the summary opens the
    Badges (T-082) and Impact (T-081) screens; App wires them (`onOpenBadges`/`onOpenImpact`) and the
    screens take the loaded catalogue + collection. Links hide when no handler is given. Tested: the
    entry points fire their callbacks, and are absent without handlers. (This Week already has its own
    tab, so no redundant entry point there.) ⚠️ On-device layout not visually verified.

## F4.3 — Species Card
- **T-059 · Species card (production)** — *Claude · M · `DONE` · deps: T-055 · [USER-FLOWS §4](USER-FLOWS.md)*
  - ✅ The card renders fact, when/how, give/protect (always free, honest-copy enforced by T-066),
    the real depth row (T-138) and find-it-nearby + pledge entries.
  - ✅ **Content now flows in as a prop, read through the repository** (`App.tsx` loads it via
    `SpeciesRepository.getContent`, locale + English fallback, keyed by species id so a stale card
    never shows the previous species' content). `SpeciesCard` is now purely presentational — no
    direct module import; the mission block hides until content resolves. The App flow test exercises
    the async read (a broken load ⇒ no give/protect ⇒ the pledge step fails), plus a null-content test.
  - ✅ **Share** (T-059): a header "↗ Share" action → RN `Share.share` with honest, season-framed
    copy (`lib/shareSpecies.ts`, invariant #1) and no upsell (invariant #4). Text only for now; a deep
    link arrives with the store/deep-linking work. Pure message builder unit-tested (name present, no
    real-time claim, no upsell, sv localized) + a card test asserting the share call.
  - ℹ️ DB-backed content arrives with the seed + Supabase repo (T-055/T-145). On-device layout unverified.
- **T-060 · Depth-tier climb-by-play logic** — *Claude · M · `DEFERRED` (Director, 2026-08-11 — with T-053) · deps: T-059, T-053 · [GDD §8](GDD.md), [ECONOMY](ECONOMY.md)*
  - Free users unlock depth tiers by playing (spot/catch/help); Full Game unlocks all immediately.
    Progression, not paywall — verified for both states.
  - ⏸️ Deferred alongside T-053: the unlock logic is only meaningful once depth content exists.

---
---

# E5 — Notification Engine (production)
**Phase:** P2 · **Goal:** the heart — a server-side scheduled engine sampling real per-cell
per-month probabilities, honest and fully tunable ([TSD §4](TSD.md)).

## F5.1 — Engine
- **T-061 · Resolve user cell + candidate set (season-gated)** — *Claude · M · `DONE` · deps: T-044, T-056 · [TSD §4](TSD.md)*
  - For each due user, resolve H3 cell and build candidates from `cell_species_month` for the
    current month where `is_active_window` (hard season gate).
  - ✅ `lib/presence.ts`: `candidatesForMonth(presence, month, collectedIds)` applies the hard
    season gate (`activeMonths.includes(month)`) and dedupes against the collection. Consumes
    `RegionPresence` (live `species_presence`); region is the interim for the per-H3 cell, so
    swapping in `cell_species_month` later is a data change, not a code change. Pure + unit-tested.
- **T-062 · Weighted sampling + dedupe** — *Claude · M · `DONE` · deps: T-061 · [TSD §4](TSD.md)*
  - Weight `w = presence_prob × rarity_flavor`; dedupe against collection; sample one.
  - `rarity_flavor` documented as observation-frequency, phrased honestly in copy.
  - ✅ `lib/presenceNotification.ts`: `selectFromPresence` runs the T-061 candidate resolver then
    weighted-samples one row. Weight `w = 1 + log10(1 + occurrences)` — a dampened presence weight:
    more-observed species surface more, but log-compression keeps the long tail in play (not "all
    sparrows"), and the `+1` floor lets active-but-unquantified species still be picked. Flavour is
    observation-frequency (honest copy, inv. #1). Injectable `Rng` for deterministic tests.
- **T-063 · Cadence, quiet hours, prefs + delivery logging** — *Claude · M · `DONE` (wired by T-201) · deps: T-062, T-032 · [TSD §4](TSD.md)*
  - Frequency cap, quiet hours, notif prefs respected; every send logged
    (delivered/opened/collected) for analytics.
  - ✅ `lib/notificationEngine.ts`: `decideNotification(user)` composes the tested parts into one
    decision — master opt-in → cadence/quiet-hours gate (T-131) → season-gated weighted selection
    (T-062). Cadence runs before selection so a blocked user costs no candidate work. `SkipReason`
    surfaces exactly why a cycle sent nothing. `recordDelivery` emits `notification_delivered` for
    the funnel (consent gating stays the tracker's concern). Pure/clock-free; deterministic `Rng`.
  - ✅ Runs in the `send-notifications` Edge Function (T-201); every send is persisted to
    `notification_log`, which is also what the cadence caps are computed from. Opened/collected
    events are the app-side funnel (T-031 deep link).
- **T-064 · Schedule via pg_cron → Edge Function** — *Claude · S · `DONE` (by T-201) · deps: T-063, T-017 · [TSD §4](TSD.md)*
  - Engine runs on schedule server-side; no client dependency; observable/retryable.
  - ✅ pg_cron job `send-notifications` (`7 * * * *`) → `pg_net` → Edge Function. Observable in
    `net._http_response` (status + JSON summary per run); retry is built in — send slots are
    at-or-after, so a failed hour self-heals the next.

## F5.2 — Honesty & Tuning
- **T-065 · Config-driven tuning levers** — *Claude · S · `DONE` · deps: T-062 · [TSD §4](TSD.md)*
  - ✅ `lib/tuning.ts`: `NotificationTuning` + `DEFAULT_TUNING` centralize the TSD §4 levers —
    the rarity-band flavour curve, the presence-weight `base`/`scale`, and the cadence-per-day cap.
    Both selection paths (`notification.ts`, `presenceNotification.ts`) thread an optional tuning
    arg (default `DEFAULT_TUNING`), so the prototype can tune the *feel* without redeploys — a
    config change, not a code change. Tests prove overrides re-shape both curves.
  - Cadence, cell resolution, rarity curve, active-window strictness all config, not hardcoded.
- **T-066 · Copy-rule enforcement** — *Claude · XS · `DONE` · deps: — · [GDD §3](GDD.md), [USER-FLOWS](USER-FLOWS.md)*
  - ✅ `lib/contentHonesty.ts` is the single source of truth for banned real-time-presence phrases
    (en + sv); `findRealtimeClaims`/`isHonest`. `contentHonesty.test.ts` enforces it across **every**
    species content field (en + sv) **and** every UI catalog string in both locales — 436 checks,
    so no copy can overclaim presence without failing the build (invariant #1). The honesty
    disclaimer (`thisWeek.honesty`), which quotes the phrase to disclaim it, is the one documented
    exemption. Deps relaxed: the check runs on existing content now (didn't need T-059/T-063).

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
- **T-068 · Proximity gating & states** — *Claude · M · `IN-PROGRESS` (geo core done; map UI pending) · deps: T-067 · [USER-FLOWS §6](USER-FLOWS.md)*
  - ✅ `lib/proximity.ts` (9 tests): `haversineMeters`, `nearestSpot`, and `proximityState` →
    `in-range` / `too-far` / `no-spots` / `gps-off` against a configurable catch radius
    (`DEFAULT_CATCH_RANGE_M = 100`). Remaining: the MapLibre map + wiring the state to the catch
    CTA — depends on real catch spots (T-048, E3) and the map screen (T-067).

## F6.2 — Per-Category Minigames
Each category gets a distinct one-thumb, 10–20s minigame; species within a category reskin the
same mechanic ([GDD §4](GDD.md)).

- **T-069 · Minigame framework + bird (timing)** — *Claude · L · `DONE` · deps: T-033 · [GDD §4](GDD.md)*
  - ✅ Shared component contract (`components/minigame/types.ts`: `MinigameProps`/`MinigameOutcome`)
    + `MinigameShell` (dark stage, instruction/hint, cancel, win-lose result screen) + a
    `CatchMinigame` dispatcher keyed by `species.category` (fungus reskins plant). The catch flow
    (App.tsx) passes `category` and one identical callback set; it never learns the mechanic table.
  - ✅ Bird timing graduated onto the shell/contract; grade copy comes from a new tested core
    (`lib/minigame/grade.ts`, `gradeFromScore` — 4 tests). Built on plain RN primitives
    (setInterval + Pressable/PanResponder), **no new deps** (consistent with the shipped bird
    game and the "no new dependencies" rule; reanimated deferred, not required for feel yet).
  - ⚠️ Animation/layout not device-verified; scoring + grade mapping are unit-tested.
- **T-070 · Fish minigame (rhythm & tension)** — *Claude · M · `DONE` · deps: T-069 · [GDD §4](GDD.md)*
  - ✅ `lib/minigame/rhythm.ts` (5 tests): `evaluateRhythm(inZoneTicks, totalTicks)` — land the
    catch by holding the line in the sweet zone for ~60% of the fight.
  - ✅ `components/minigame/FishReelMinigame.tsx`: press-and-hold reels a sweet-zone band up, gravity
    sinks it; a fish drifts on a deterministic sine; each tick samples in-zone → `evaluateRhythm`. ⚠️ not device-verified.
- **T-071 · Insect minigame (trace)** — *Claude · M · `DONE` · deps: T-069 · [GDD §4](GDD.md)*
  - ✅ `lib/minigame/trace.ts` (5 tests): `evaluateTrace(distances)` — follow the flight path;
    a break is a sample past tolerance, forgiven up to an allowance.
  - ✅ `components/minigame/TraceMinigame.tsx`: PanResponder tracks the finger; a butterfly flies a
    deterministic figure-eight; per-tick finger↔target distance → `evaluateTrace`. ⚠️ not device-verified.
- **T-072 · Mammal minigame (stealth)** — *Claude · M · `DONE` · deps: T-069 · [GDD §4](GDD.md)*
  - ✅ `lib/minigame/stealth.ts` (4 tests): `evaluateStealth(ticks)` — advance on safe ticks,
    spotted if moving while alert, land by reaching the required progress.
  - ✅ `components/minigame/StealthMinigame.tsx`: hold to creep, release to freeze; a telegraphed
    calm→warn→alert cycle; per-tick {moving, alert} → `evaluateStealth`. ⚠️ not device-verified.
- **T-073 · Plant/fungus minigame (spot & frame)** — *Claude · M · `DONE` · deps: T-069 · [GDD §4](GDD.md)*
  - ✅ `lib/minigame/frame.ts` (4 tests): `evaluateFrame(distanceFromCenter, targetRadius)` —
    accuracy falls off linearly from the subject centre; land it above the threshold.
  - ✅ `components/minigame/FrameMinigame.tsx`: drag a reticle onto the subject among decoy
    plants, then capture; reticle↔subject distance → `evaluateFrame`. ⚠️ not device-verified.

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
- **T-076 · Give/Protect pledge screen** — *Claude · M · `DONE` · deps: T-052, T-059 · [USER-FLOWS §7](USER-FLOWS.md)*
  - ✅ First Phase-2 feature after the gate: the **Helped tier** is now wired into the app,
    completing the three-tier loop (Spotted → Caught → Helped). The species card shows give +
    protect ("why it matters", knowledge-first) each with a one-tap **"✓ I'll do this"** pledge
    (`onPledge`) → `collection.help(kind)` marks Helped and shows `PledgeConfirm` — a clean
    honor-system confirmation with the standing follow-local-law line and **no upsell/ads**
    (invariant #4). `useCollection` gained `help()`. ⚠️ On-device layout not visually verified.
- **T-077 · pledges table + impact feed** — *Claude · S · `IN-PROGRESS` (pledges recorded via collection; dedicated table/feed pending) · deps: T-076, T-056 · [TSD §3](TSD.md), [GDD §7](GDD.md)*
  - ✅ Pledges are recorded as Helped collection records (`helped_at` / `helped_kind`), persisted
    via the Supabase store (T-027) with owner RLS; the impact aggregation (`lib/impact.ts`, T-128)
    already derives give/protect/helped counts from them — no proof required, no upsell on the
    moment. Remaining: a dedicated `pledges`/`impact_counters` surface + community feed (T-081).

---
---

# E8 — Retention & Engagement
**Phase:** P2 · **Goal:** keep the app alive beyond the passive drip, which saturates
([GDD §7](GDD.md)). The pull surface is the priority lever; the rest layer on.

## F8.1 — This Week (production)
- **T-078 · "Active this week" (production)** — *Claude · M · `DONE` (wired + re-ordered by T-207) · deps: T-044, T-057 · [USER-FLOWS §3](USER-FLOWS.md), [TSD §4b](TSD.md)*
  - Real query on `cell_species_month`; ordered new-first then rarity; works without
    notifications; quiet-week and location-off states.
  - ✅ `lib/thisWeekProduction.ts`: `thisWeekFromPresence(presence, month, collected)` reads live
    `species_presence` (region is the interim for the per-cell query), season-gates, and orders
    new-first then rarer-first (observation count as rarity flavour — fewer occurrences ranks
    earlier). The two empty states are first-class result variants (`location-off` when no region
    resolves, `quiet` when nothing is active) so the screen never infers them from an empty array.
    Notification-independent (pure read). 6 tests.

## F8.2 — Seasonal & Events
- **T-079 · Seasonal window handling** — *Claude · M · `DONE` · deps: T-044 · [GDD §7](GDD.md)*
  - Migrants only catchable when genuinely passing through; season is a hard constraint.
  - ✅ `lib/seasonalWindow.ts`: `catchableThisMonth`/`isInSeason` is the hard catch-time gate — a
    migrant not currently in-window can't be caught even at a habitat spot. `seasonWindow` also
    classifies migrant vs resident (window ≤ `MIGRANT_MAX_WINDOW_MONTHS`) and returns
    `monthsUntilOpen` (year-boundary-wrapping) so copy can say "expected back around <month>"
    honestly rather than implying presence (invariant #1). Windows come from region `activeMonths`
    (interim for T-044's per-cell windows — a data swap, not a code change). 7 tests.
- **T-080 · Live events** — *Claude · M · `DONE` (prototype windows; real-data windows with E3) · deps: T-079 · [GDD §7](GDD.md)*
  - ✅ `lib/liveEvents.ts` (3 tests): `KRONOBERG_EVENTS` (first-swift-of-spring, salmon run,
    mushroom bloom, first frost) with honest month windows; `activeEvents(date)`/`isEventActive`.
  - ✅ **Surfaced on This Week**: `components/liveEventVisual.ts` maps each event id → emoji + i18n
    name/blurb keys; `ThisWeekScreen` renders a "Happening this season" strip (as the list header)
    showing only events genuinely under way — nothing out of season. Copy is honesty-safe (no
    "here right now") and i18n (en+sv). `liveEventVisual.test.ts` (2 tests) asserts every event id
    has a visual entry and points at real i18n keys.
  - ⚠️ On-device layout not visually verified. Real-data event windows replace the hardcoded
    Kronoberg set with E3 (T-079/T-044).

## F8.3 — Impact & Badges
- **T-081 · Collective impact counters** — *Claude · M · `DONE` (community totals applied + verified live 2026-10-29) · deps: T-077 · [GDD §7](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - ✅ `components/ImpactScreen.tsx` (2 tests) shows the help the user has pledged this season —
    species helped / give / protect counts from the tested `lib/impact.ts` `impactSummary`. Honest by
    construction (invariant #1): counts only real pledges, and shows a plain "community totals coming"
    note rather than a fabricated figure. No upsell (invariant #4). i18n en+sv. Reached from the
    Almanac (T-058).
  - ⏳ Remaining (server): **community totals** ("4,200 nest boxes this spring") from
    `impact_counters` refreshed by cron (needs T-077 table + pg_cron), then swap the note for the real
    aggregate. Shareable once the community number is real.
  - ✅ **Community totals (2026-10-29):**
    - `public.community_impact()` (migration `20261029000005`) is one aggregate over the Helped
      rows of `collection` for the server's current season. It returns helpers, pledges, give and
      protect. SECURITY DEFINER because collection RLS is owner-only; it returns counts, never
      rows. Executable by anon + authenticated.
    - **No `impact_counters` table + cron:** at MVP scale the scan is milliseconds, and a counter
      table is a second copy that can drift from the rows it counts. Revisit past ~1M collection
      rows, starting with an index on `helped_at` and a season range predicate.
    - App: `lib/communityImpact.ts` (parse, `COMMUNITY_MIN_HELPERS = 3` threshold, supabase
      source) and `components/useCommunityImpact.ts`. The totals are read only while the Impact
      screen is open.
    - The screen shows "This season, N people pledged M actions for wildlife: X give, Y protect"
      (en + sv). Below 3 helpers, or when the read fails, it keeps the honest "coming" note.
    - Tests: 14 app tests; 3 live checks in `verify.py` (a pledge made today is counted, anon can
      read the totals, anon still reads no collection rows); a verdict test for a leak.
  - Not built: the per-species line "You + N others helped swifts this spring" (USER-FLOWS §4).
    It would be the same aggregate filtered to one species.
  - ✅ **Applied + verified live:** db-migrate run 40838848358 applied it. The verify run
    40838913042 passed all 25 checks, rolled back. Live today: `2026-autumn`, 0 pledges, so the
    screen correctly shows the note until 3 people are helping.
- **T-082 · Badges & completion** — *Claude · M · `DONE` (category + spotted/helped milestones; season/habitat need E3) · deps: T-057 · [GDD §8](GDD.md)*
  - ✅ `components/BadgesScreen.tsx` (3 tests) renders the full badge set — earned ones lit, the rest
    as locked goals with a "{earned} of {total} earned" line — over the tested earn rules in
    `lib/badges.ts` (category completion + spotted 10/25/50 + helped 1/5/10). Labels are i18n en+sv;
    no upsell (invariant #4). Season/habitat badges arrive with the real data layer (E3).
  - ℹ️ Reached from the Almanac (T-058). On-device layout not visually verified.

---
---

# E9 — Monetization
**Phase:** P2 · **Goal:** the single clean purchase decision — Full Game $9.99, no ads, no
subscription ([ECONOMY](ECONOMY.md)). Free-catch limit is the only conversion nudge.

## F9.1 — RevenueCat & Store
- **T-083 · RevenueCat SDK + entitlement sync** — *Claude · M · `IN-PROGRESS` (resolution core done; SDK + sync pending, needs T-004) · deps: T-004, T-056 · [ECONOMY](ECONOMY.md), [TSD §1,§3](TSD.md)*
  - ✅ `lib/entitlement.ts` (3 tests): `FULL_GAME_ENTITLEMENT` + `resolveEntitlements(activeIds)`
    → `{ fullGame }`, the single source of truth the app already consumes (depth tiers T-138,
    free-catch T-113). Remaining (needs the RevenueCat account, T-004): the SDK integration that
    produces the active-entitlement ids and mirrors `full_game` to Supabase.
- **T-217 · Entitlements are granted by the server (RevenueCat webhook)** — *Claude + Director · M · `TODO` · deps: T-200 · [ECONOMY](ECONOMY.md), [TSD §3](TSD.md)*
  - `profiles.full_game` is server-only since T-200, and the free-catch trigger already honours it.
    Nothing sets it yet.
  - An Edge Function receives RevenueCat webhooks (purchase, refund/cancel, transfer),
    authenticated by a shared secret header, and sets or clears the entitlement on the user's
    profile. The app's RevenueCat user id is the Supabase user id.
  - Family (T-102) needs this, because a member's entitlement must come from the buyer's
    server-side purchase, not from the member's own store account.
  - Director: set the webhook URL and secret in RevenueCat once T-004 exists.
- **T-084 · Full Game product + purchase flow** — *Claude · M · deps: T-083 · [ECONOMY](ECONOMY.md)*
  - **$4.99 / 49 SEK** one-time product (price set by the Director 2026-10-29, was $9.99; see
    ECONOMY.md for the trade-off) purchasable on both stores (sandbox verified); unlocks unlimited
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
- **T-088 · Granular consent (no pre-ticked boxes)** — *Claude · M · `IN-PROGRESS` (model + UI + local persistence + analytics gate done; Supabase profile sync pending) · deps: T-018 · [PRIVACY §2](PRIVACY-COMPLIANCE.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - ✅ `lib/consent.ts` (5 tests): `ConsentState` for location/notifications/analytics, all
    defaulting **off** (no pre-ticked boxes); `grant`/`revoke`/`setConsent`/`hasConsent`, immutable.
    **No `ads` consent kind** (no ads — invariant #3). ✅ **UI:** the Settings screen has the three
    granular toggles (defaulting off) with the "you choose / no ads" hint.
  - ✅ **Persistence** `lib/consentStore.ts` (8 tests): pure `parseConsent`/`serializeConsent`
    (only a literal `true` grants — corrupt/missing/non-true decays to OFF, so "no pre-ticked boxes"
    survives bad data) + in-memory and `AsyncStorage` stores (mirrors the collectionStore seam).
    App rehydrates consent on launch and saves on every toggle, so choices survive a restart.
  - ✅ **Feature gate confirmed wired:** `useTracker` wraps the delegate in `ConsentGatedTracker`, so
    no analytics event reaches PostHog before `analytics` consent is granted (invariant #6).
  - Remaining: sync consent to the Supabase **profile** (pairs with the export/delete flows,
    T-092/T-093); location/notification consent already mirror their OS-permission results.
- **T-089 · Age-gate (GDPR-K, Sweden 13)** — *Claude · S · `DONE` (birth-year step + restricted routing; on-device layout unverified) · deps: T-088 · [PRIVACY §3](PRIVACY-COMPLIANCE.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - ✅ `lib/ageGate.ts` (4 tests): birth-**year**-only gate (data minimization), `DIGITAL_CONSENT_AGE_SE = 13`,
    `agePath()` → `full` | `restricted` for the minimal-data path.
  - ✅ **Onboarding step** `components/onboarding/AgeGateStep.tsx` (3 tests) — a birth-**year** input
    (digits-only, 4 max, plausible-range validated; Continue inert until valid). Inserted in the step
    machine (`lib/onboarding.ts`) right after `welcome`, **before** any permission ask or the first
    Spotted, so age is established before data processing (GDPR-K). i18n en+sv.
  - ✅ **Restricted routing** = the minimal-data path the doc calls for (kids-mode proper is v2,
    PRIVACY §3): under-13 → **analytics is never offered** — the Settings toggle is removed (not just
    defaulted off) and `toggleConsent` refuses to enable `analytics`, so no behavioural data on minors.
    No one is blocked (general-audience positioning). App flow test drives a minor through onboarding
    and asserts the analytics opt-in is withheld.

## F10.2 — Location Minimization & Hometown
- **T-090 · Hometown GPS-derive-once + discard coordinates** — *Claude · M · `DONE` · deps: T-088 · [PRIVACY §1](PRIVACY-COMPLIANCE.md), [ECONOMY](ECONOMY.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - Device location resolved once to a region; **coordinates discarded**, only `home_region_id`
    stored; hometown locked (support-only change). No manual picker.
  - Location-denied → preview mode; hometown set on first grant.
  - ✅ **On-device lookup** (`lib/hometown.ts`): one Balanced-accuracy fix → ray-casting against
    bundled outlines of all 21 counties (`lib/geo/swedishCounties.ts`, ~128 KB, 8,036 points). The
    fix never leaves the phone; a reverse-geocoding API was rejected for sending it to a third party.
  - ✅ **Outlines are Natural Earth (public domain), not GADM** — GADM's licence forbids commercial
    use. Joined to the GADM ids by name in `pipeline/geo/county_shapes.py`; the build fails unless
    all 21 join one-to-one ("Orebro" → Örebro is the case that proves the folding).
  - ✅ **Nearest-county fallback within 15 km** for islands the 1:10m outlines leave out. Measured:
    10 km lost Landsort and Sandskär; 20 km pulled Kastrup and Dragør (Denmark) into Skåne. Tests
    pin one real town per county, the outer islands, and Oslo / Copenhagen / Kastrup / Helsinki → null.
  - ✅ **Locked** (`lib/hometownStore.ts`): the first county stored wins; a later fix only reads it
    back. Stores id + name only; an unknown or pre-T-090 id (`kronoberg`) is discarded on load.
  - ✅ Onboarding confirms the real county; denied / no fix / outside Sweden → preview mode. The
    app rehydrates the locked county on launch and sends it to `profiles.home_region`, so push
    notifications (T-201) now use the user's own county.
  - ⚠️ Outside Sweden currently means preview mode, not a "not here yet" path — that is **T-107**.
  - ⚠️ Tornio (FI) and Helsingør (DK) touch Sweden and resolve to Norrbotten / Skåne at any limit.
    Accepted: same species, and v1 is not marketed there.
- **T-091 · Cell-level location storage only** — *Claude · S · `IN-PROGRESS` (H3 adopted; runtime wiring pending) · deps: T-090 · [PRIVACY §1](PRIVACY-COMPLIANCE.md), [TSD §3](TSD.md)*
  - ✅ **H3 adopted (Director decision).** `lib/cell.ts` (5 tests) now uses **`h3-js`** — `cellKey`
    returns an H3 index at `DEFAULT_CELL_RESOLUTION = 8` (~0.74 km² hex), so only a coarse area is
    ever retained, never a precise point (PRIVACY §1). Same H3 system the pipeline's per-cell presence
    uses (TSD §3, T-043/T-044), so app + data cells line up; `cellResolution` exposes the grid level.
    `h3-js@4.5.0` is MIT + pure-JS (already in the approved stack). Tests: valid cell + resolution,
    a point reduces to its containing cell, distant points differ, opaque index, coarser buckets more.
  - ✅ **Jest fix (T-091):** h3-js' emscripten build calls `TextDecoder` on import, which jest-expo's
    winter runtime stubs and throws on — restored Node's `TextDecoder`/`TextEncoder` via a
    `setupFilesAfterEnv` (`jest.setup.js`; the preset left that unset, so it adds not clobbers).
  - Remaining: wire the runtime catch-location through `cellKey` (deferred with the catch/geo work).

## F10.3 — GDPR Rights
- **T-092 · Data export endpoint** — *Claude · M · `DONE` (reachable + produces the bundle; file-share later) · deps: T-056 · [PRIVACY §2](PRIVACY-COMPLIANCE.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - ✅ `lib/dataExport.ts` (3 tests): `buildDataExport` → versioned, deterministic bundle
    (profile + consent + collection); `exportToJson`. ✅ **Settings → "Export my data"** opens
    `DataExportView` showing the full bundle as selectable JSON the user can copy — reachable
    anytime (invariant #6). Later: a file/share download and reading server-authoritative profile/
    consent once those persist.
- **T-093 · Account + data deletion** — *Claude + Director · M · `IN-PROGRESS` (client flow + tested seam + Edge Function written; deploy pending) · deps: T-056 · [PRIVACY §2](PRIVACY-COMPLIANCE.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - ✅ **Client flow** reachable from Settings at all times (invariant #6): a danger-styled
    "Delete account & data" row → `components/DeleteAccountConfirm.tsx` (4 tests) — an explicit,
    irreversible-delete confirmation (equal-weight Cancel, no dark patterns, retryable error on
    failure). i18n en+sv.
  - ✅ **Tested seam** `lib/accountDeletion.ts` (4 tests): pure `deleteAccount(gateway)` guards
    (signed-in → erase → local sign-out; failed erase is retryable and leaves the session intact;
    a post-erase sign-out failure is non-fatal) + `SupabaseDeletionGateway` (invokes the Edge
    Function, then `auth.signOut`). On success the app resets to a fresh, signed-out state.
  - ✅ **Edge Function written** `supabase/functions/delete-account/index.ts` — deletes the *calling*
    user (id from their own verified JWT, never the request body) via the service-role admin API; the
    `ON DELETE CASCADE` on `collection`/`profiles` wipes their rows. Excluded from app eslint/tsc
    (Deno runtime).
  - ⏳ **Director:** deploy the function (`supabase functions deploy delete-account`). Until then,
    `functions.invoke` errors and the confirm screen shows the retryable "not deleted" message — by
    design. Executing a real deletion + on-device verify is a Director/device step.
- **T-094 · Retention policy & auto-expiry** — *Claude · S · `DONE` (applied + verified live 2026-10-29) · deps: T-091 · [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - ✅ `lib/retention.ts` (3 tests): `DEFAULT_RETENTION` windows (runtime location 30d < inactive
    anonymous 90d < analytics 365d) + `isExpired`/`expiryMs`. Remaining: the pg_cron job that
    applies expiry (deletes stale rows / anonymous users).
  - ✅ **The job** (migration `20261029000004_retention.sql`): `public.apply_retention()`, run daily
    at 03:41 UTC by pg_cron. SECURITY DEFINER; users cannot execute it. It deletes:
    - `notification_log` rows older than **30 days** (new window, `notificationLogDays`). The
      sender's caps read 48 h.
    - **anonymous** accounts with no activity for **90 days**, with everything that cascades from
      `auth.users`. All 14 FKs onto it cascade or set null, checked live. Email-linked accounts
      are never expired.
  - ⚠️ **Activity is the latest of every signal**: sign-in, user update, session refresh,
    refresh-token rotation, collection write, push-device re-registration. `last_sign_in_at` alone
    does not move on a token refresh, so a user who opens the app daily would have been deleted.
    When in doubt, the job keeps the account.
  - Not handled here, by design: runtime location is never stored server-side (T-091), and
    analytics retention is the PostHog project setting (Director, with T-035).
  - Tests:
    - `pipeline/tests/test_retention_job.py` pins the SQL windows to `lib/retention.ts`, which
      the privacy policy quotes.
    - `pipeline/db/verify.py` gained 10 rolled-back live checks, with throwaway accounts: an idle
      anonymous account is deleted; one with a session refreshed today, one with a collection
      write today, and an idle email-linked one are kept; a 40-day-old log row is deleted and
      yesterday's kept.
  - The privacy policy draft now says "deleted automatically", not "eligible for deletion". It
    lists notification history, and says runtime location is not stored server-side (legal
    review is still T-095).
  - ❓ **Director, worth a look:** the app is seasonal. Someone who stops opening it from November
    to March (more than 90 days) comes back to an empty collection. The window is one constant
    plus its SQL twin; 400 days would cover a full season cycle.
  - ✅ **Applied + verified live (2026-10-29):**
    - db-migrate run 40837678318 applied it; `cron.job` lists `apply-retention 41 3 * * *`.
    - The verify run 40837721891 passed all 22 checks, rolled back.
    - Dry run of the activity rule before the first night: of the 3 anonymous accounts, the 2 July
      test accounts (`e249bbd6`, `5e6763d4`, idle since 5 and 7 July) expire on the first run. The
      Director's phone account (`0e08dc15`, active 28 Oct) is kept.

## F10.4 — Legal Artifacts
- **T-095 · Privacy policy + in-app consent copy** — *Claude + Director · M · `IN-PROGRESS` (policy drafted; legal review + hosting pending) · deps: T-009, T-088 · [PRIVACY](PRIVACY-COMPLIANCE.md)*
  - ✅ Draft policy `docs/legal/PRIVACY-POLICY.md` written from PRIVACY-COMPLIANCE.md: what's
    collected + legal basis, no-ads/no-sale, location derive-once-and-discard, sub-processors
    (Supabase/PostHog/RevenueCat/Google Play), retention windows, GDPR rights (in-app export +
    delete), IMY complaint route, 13+ age-gate. Honest and minimization-first.
  - ⚠️ **Director:** fill the `[bracketed]` controller identity + contact email, get legal review
    (T-009), and **publish at a stable URL** — that URL is the required Google Play privacy-policy
    link. In-app "Privacy policy" link (Settings) wires up once the URL exists.
- **T-096 · Processor DPAs + EU residency verified** — *Director · M · deps: T-009 · [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - Signed DPAs and verified EU residency/SCCs for Supabase, RevenueCat, PostHog.

---
---

# E11 — Launch, Analytics & Ops
**Phase:** P2 · **Goal:** ship the single-region public app and be able to see what it's doing.

## F11.0 — Google Play Internal Testing (first testable build)
The fastest path to real testers holding the app: Google Play **Internal testing** (≤100 testers,
opt-in link) — it skips the "closed testing, 12+ testers, 14 days" rule that gates production for
personal accounts. Ships the current prototype loop; IAP/data-layer/map are deferred.

- **T-140 · Android build config for the first Play build** — *Claude · S · `DONE` (config committed; EAS env + build run are Director) · deps: T-014 · [TSD §1](TSD.md)*
  - ✅ `app.json`: added the required **`android.package`** (`com.nearlife.nearby`) + matching iOS
    `bundleIdentifier`; added **`expo-notifications`** and **`expo-location`** config plugins (the
    latter with an honest, PRIVACY §1-aligned when-in-use permission string).
  - ✅ `.env.example`: documents the four `EXPO_PUBLIC_*` build vars (Supabase URL + publishable
    key, PostHog key + host) and how to provision them as EAS environment variables per profile.
  - ⚠️ **Package id is permanent once uploaded to Play** — Director confirms/changes
    `com.nearlife.nearby` before the first upload. Creating the EAS env vars and running
    `eas build -p android --profile production` (needs `eas login`) remain Director steps.
- **T-141 · On-device smoke test of the prototype loop** — *Claude + Director · M · `TODO` · deps: T-140 · [GDD §9](GDD.md)*
  - Run the app on a real device (Expo Go / dev build) and walk onboarding → This Week (incl. the
    live-events strip) → species card → catch minigame (all five categories) → Helped pledge →
    Settings (consent, export, language). Fix layout/runtime issues so testers get a working app.
    Confirm Supabase anonymous auth + collection persistence work on-device (closes the T-027
    device-run gap). This pays down the "not visually verified" debt across the screens.
- **T-162 · Align SDK-57 dependencies + add expo-dev-client (dev-build enablement)** — *Claude · S · `DONE` · deps: T-140 · [TSD §1](TSD.md)*
  - ✅ Expo Go can't run this SDK-57 app, so device testing needs an EAS **dev build** — which needs
    `expo-dev-client`. Installing it required aligning the SDK-57 patch set: `expo` ~57.0.2 → ~57.0.10,
    `react-native` 0.86.0 → 0.86.2, and the `expo-*` packages, resolved with a clean install (a stale
    tree produced a phantom `@react-native/jest-preset` peer conflict).
  - ✅ All verify (1129 tests / lint / typecheck) runs on the aligned set; `package-lock.json`
    normalized so CI `npm ci` stays consistent. **Director:** `eas build --profile development` +
    install the APK, then `npx expo start --dev-client` (the on-device run is T-141).

## F11.1 — Store Submission
- **T-097 · Store listings + assets** — *Claude + Director · M · `IN-PROGRESS` (copy + form answers drafted; final name/graphics/submission pending) · deps: T-084 · [review]*
  - ✅ `docs/launch/PLAY-STORE-LISTING.md`: short + full description (honesty-safe copy), category,
    **Data safety** answers, **content-rating** (IARC) answers, **target audience 13+**, **Ads: No**,
    and **App access = no login required**. All reflect the first internal-testing build (no IAP yet).
  - ⚠️ **Director:** trademark-check the name "Nearby" (generic — may collide); supply the
    **feature graphic (1024×500)** + screenshots (need a running build, T-141); enter the listing +
    App-content answers in Play Console. Revisit Data safety/Ads if IAP or a social layer is added.
- **T-098 · App Store + Play submission & review** — *Director · L · deps: T-095, T-096, T-097, all P2 build epics · [PRIVACY §3](PRIVACY-COMPLIANCE.md)*
  - Builds submitted; review passed; app live in target market.

## F11.2 — Observability
- **T-099 · Production analytics dashboards** — *Claude · S · deps: T-035 · [TSD §8](TSD.md)*
  - Retention, conversion (taste funnel), notification open rate dashboards live.
- **T-100 · Error & pipeline monitoring** — *Claude · S · deps: T-045, T-064*
  - Crash/error reporting on the app; alerting if the data pipeline or notification cron fails.

## F11.3 — Attribution
- **T-101 · Attribution surfaces** — *Claude · XS · `DONE` (copy live; DOIs when the pipeline lands) · deps: T-045, T-046 · [DATA-SOURCING](DATA-SOURCING-LICENSING.md), [USER-FLOWS §9](USER-FLOWS.md)*
  - ✅ The Settings screen's "Data & attribution" section shows GBIF ("GBIF.org and its
    contributing datasets") and "© OpenStreetMap contributors" (i18n `attribution.*`). Per-dataset
    DOIs get appended once the GBIF pipeline captures them (T-045).

---
---

# E12 — Post-Validation Expansion (v2)
**Phase:** P3 · **Goal:** the deferred SKUs and social layer, built only once single-player
conversion is proven. Cut from v1 deliberately ([ECONOMY](ECONOMY.md), [GDD §8](GDD.md)).

## F12.1 — Family SKU & Households
> **Moved into v1 (Director, 2026-10-29)**, scoped to the **shared unlock**. Family is $9.99 / 99
> SEK for up to 5 people, each with their own collection. The shared almanac stays v2 (T-104).
> See ECONOMY.md.

- **T-102 · Households (shared unlock)** — *Claude · M · `TODO` · deps: T-217 · [ECONOMY](ECONOMY.md), [TSD §3](TSD.md)*
  - `households` (owner, invite code) and `household_members` (≤ 5 including the owner). The owner
    is whoever holds the Family entitlement. A member's Full Game is derived on the server from
    membership, so it can never be granted client-side (same rule as T-200).
  - Join by code, leave, and owner removes a member. When the Family purchase ends (refund), every
    member loses the derived entitlement.
  - Live checks in `verify.py`: the 6th join is refused; a stranger cannot read a household; a
    member cannot grant themselves anything.
- **T-103 · Family SKU + invite flow** — *Claude + Director · M · `TODO` · deps: T-102, T-083 · [ECONOMY](ECONOMY.md)*
  - The `family` product (Director creates it in Play Console at 99 SEK) is the RevenueCat
    entitlement that makes its buyer a household owner. A screen shows the invite code (share
    sheet) and the member list, and offers join-with-code to non-buyers.
  - Minors: joining adds no personal data (anonymous accounts linked by a code), and the age
    gate rules still apply per member. Confirm with legal review (T-009).
- **T-104 · Family shared almanac** — *Claude · L · v2 · deps: T-102 · [USER-FLOWS §7 (v1 note)](USER-FLOWS.md)*
  - Household view, member activity feed, family impact counter, personal/family toggle on Home.
    Deferred: v1 Family is the shared unlock only.

## F12.2 — Regions & World Pass
> **Moved into v1 (Director, 2026-10-29).** v1 is Sweden only, so a "region" is one of the 20
> counties that are not your home county, and the "World Pass" covers all of Sweden. Prices are
> still to be confirmed against the new 49 SEK anchor; the ECONOMY.md figures are $2.99 / $19.99.

- **T-105 · Region pack + All-Sweden pass products** — *Claude + Director · M · `TODO` · deps: T-217, T-083 · [ECONOMY](ECONOMY.md)*
  - Products (Director creates them in Play Console): one pack per county, or a single
    "pick a county" pack, plus the all-counties pass. Owned regions are recorded server-side by
    the T-217 webhook, never client-side.
  - Region switcher: home county plus owned counties. A locked county shows its This Week list
    as a preview (names + photos), with catching and the full Almanac locked. The mission
    content stays free everywhere (invariant #2).
- **T-218 · Travel: notice when the phone is in another county** — *Claude · S · `TODO` · deps: T-105, T-090 · [ECONOMY](ECONOMY.md)*
  - While the app is open, a coarse position check (county only, discarded at once, same
    resolver as onboarding, T-090) notices that you are outside your home county. It offers that
    county's preview and its pack, once per county per visit. It never nags, and it never fires on
    a delight moment (invariant #4).
  - The hometown stays locked (ECONOMY.md); this only opens another county alongside it.
- **T-106 · New-region onboarding pipeline (repeatable)** — *Claude + Director · L · deps: T-042, T-052 · [ECONOMY](ECONOMY.md)*
  - Repeatable process to open a region: run GBIF/OSM pipeline + light content pass (safe-default
    advice + follow-law) + Director editorial review. Modeled as growth spend.
- **T-107 · Waitlist for unopened home regions** — *Claude · S · `DONE` (graceful path; the waitlist itself is T-214) · deps: T-090 · [review]*
  - Signup from an unopened region → graceful "not in your area yet — join the waitlist" path
    instead of a dead app.
  - ✅ `deriveHometown` now says *why* there is no hometown: `no-fix` (GPS off, timeout) or
    `outside-sweden`. Outside Sweden gets its own onboarding screen — "Not in your area yet / Nearby
    covers Sweden for now…" → **Explore the preview** — instead of a silent preview whose banner
    told them to "allow location" (which they had). The banner now reads true in every case:
    "Preview — showing a sample region until Nearby knows your home county." en + sv; the honesty
    catalog test covers the new strings.
  - The **waitlist** half is deliberately not built: what to collect (an email? only a country
    count?) is a product + privacy decision — logged as T-214.
- **T-214 · What does the out-of-area waitlist collect?** — *Director · S · `TODO` · deps: T-107*
  - Options: (a) nothing — the T-107 screen is enough until v2; (b) an anonymous count of
    out-of-area installs (no PII; would need a coarse country, i.e. a reverse lookup the app avoids
    today); (c) an opt-in email for "tell me when Nearby reaches Norway" — PII, needs a consent line
    and deletion path. Claude builds whichever is chosen.

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

- **T-128 · Collective-impact aggregation** — *Claude · S · `DONE` · deps: T-115 · [GDD §7](GDD.md), [TSD §3](TSD.md)*
  - ✅ `lib/impact.ts`: `impactSummary` → helped-species / total-pledges / give / protect from
    collection records (works for a user or a community union); 3 tests. Core of the impact
    counters (T-081).

- **T-131 · Notification cadence & quiet-hours logic** — *Claude · S · `DONE` · deps: T-110 · [TSD §4](TSD.md)*
  - ✅ `lib/cadence.ts` (8 tests): `canSendNow` gates a send by quiet hours → daily cap →
    frequency cap (priority order, exact boundaries), and `isQuietHour` handles a window that
    wraps past midnight. Clock/timezone-free (caller passes `nowMs` + local hour); all levers are
    config (`CadenceConfig`, T-065). This is the "may we send now?" half of the engine that the
    scheduled Edge Function evaluates — the prototype cadence (T-032) and production engine (T-063)
    wrap it unchanged, alongside the tested candidate selection (T-112).

- **T-137 · Prime-bonus computation** *(renumbered from T-134 to resolve a merge collision with the pipeline's T-134)* — *Claude · XS · `DONE` · deps: T-110 · [GDD §6](GDD.md)*
  - ✅ `lib/primeBonus.ts` (3 tests): `isPrimeCatch(species, date)` — a catch earns the prime bonus
    only inside the species' active window (reuses `isActiveInMonth`). Wired into the prototype
    catch flow in `App.tsx` (replaced the hardcoded `false`); the production catch resolution
    (T-074) consumes the same helper.

- **T-139 · Badge earn logic** *(renumbered from T-136 to resolve a merge collision with the pipeline's T-136)* — *Claude · S · `DONE` · deps: T-115 · [GDD §8](GDD.md)*
  - ✅ `lib/badges.ts` (4 tests): `earnedBadges(records, species)` → category-completion badges
    (all species in a category spotted), spotted-count milestones (10/25/50), helped-count
    milestones (1/5/10), stable order. Habitat/season badges arrive with the real data layer (E3).
    Core of the badges UI + almanac completion (T-082); labels are i18n at the UI layer.

- **T-138 · Depth-tier climb-by-play logic** *(renumbered from T-135 to resolve a merge collision with the pipeline's T-135)* — *Claude · S · `DONE` · deps: T-115 · [GDD §8](GDD.md), [ECONOMY](ECONOMY.md)*
  - ✅ `lib/depthTier.ts` (7 tests): `unlockedDepth(tier, fullGame)` / `isDepthUnlocked` — Tier 1
    free, then climb by spotting → catching → helping (all three = mastery, level 5); Full Game
    opens all 5 immediately. Tests assert **both** states reach the same depth (progression, not
    paywall). Wired into `SpeciesCard`'s depth row (was a static placeholder). The production task
    **T-060** is this logic + the real Full Game entitlement (T-083, RevenueCat).

- **T-132 · Analytics event catalog + tracker seam** — *Claude · S · `DONE` · deps: — · [TSD §8](TSD.md), [VALIDATION-CRITERIA.md](VALIDATION-CRITERIA.md)*
  - ✅ `lib/analytics.ts` (5 tests): a typed `AnalyticsEventProps` catalog (session start, This
    Week opened, notification delivered/opened, species spotted w/ source, catch attempted/
    succeeded, free-catches exhausted, paywall shown) + a `Tracker` interface with `NoopTracker`
    (safe default) and `InMemoryTracker` (tests/local funnel). `retentionDayIndex` derives the
    D1/D3/D7 buckets the criteria need. Storage-free, no PII (ids/enums only). The PostHog-backed
    tracker (T-035, blocked on the PostHog account) implements `Tracker` as a drop-in.

**Logic-first coverage:** ~22 test suites / ~127 tests green across `lib/`. This is the testable
core the Supabase-backed store, Edge Functions, and RN screens will wrap once accounts land.
Covered: seasons, This Week, almanac grid, notification weighting, notification cadence &
quiet-hours, free-catch, minigame timing, collection model + store, onboarding flow, hometown
resolution, analytics event seam, i18n runtime + locale resolution + coverage matrix, Swedish
content, media schema, collective impact.

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
- **T-123 · Locale detection & selection** — *Claude · S · `DONE` · deps: T-120 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ Settings now has a **language override** (English / Svenska, the live locales) that takes
    precedence over device detection — the "user override" the T-120/T-123 runtime anticipated.
    (Persisting the choice across launches lands with profile persistence.)
  - ✅ `lib/i18n/resolveLocale.ts` (pure, 4 tests) maps a BCP-47 tag → supported Locale with
    English fallback; `lib/i18n/deviceLocale.ts` reads `expo-localization`; `App.tsx` uses it.
    User override persists once the Settings screen exists (T-009 flow / USER-FLOWS §9).

## F13.2 — Localized species content
- **T-122 · Locale-aware content architecture + Swedish names** — *Claude · M · `DONE` · deps: T-020, T-120 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md), [TSD §3](TSD.md)*
  - ✅ `lib/species/localized.ts`: `commonNameFor`/`contentFor` keyed by locale with English
    fallback; `lib/species/names.sv.ts`: Swedish common names for all 54 species (coverage-tested);
    8 tests. Swedish *content* (fact/when-how/give/protect) is T-127.
- **T-127 · Swedish species content translation** — *Claude + Director · L · `DONE` (first pass; native review pending) · deps: T-122 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ `lib/species/content.sv.ts`: fact/when-how/give/protect in Swedish for all 54 species,
    registered in `CONTENT_BY_LOCALE`; `content.sv.test.ts` (4 tests: full parity, no orphans,
    all fields, Swedish honesty rule). **Status `machine` — native review required before sv
    ships (T-125)**; `sv` stays not-live in the coverage matrix until reviewed.
- **T-124 · EU locale coverage matrix + status tracking** — *Claude · S · `DONE` · deps: T-122 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - ✅ `lib/i18n/coverage.ts`: `LOCALE_STATUS` (missing/machine/reviewed) for all 24 locales;
    `isLiveForUsers`/`liveLocales` (reviewed-only gate), `translationProgress`; 5 tests. en
    reviewed; sv in progress (not live until T-127 + native review). Per-species/field
    granularity can extend this when content translation lands.
- **T-125 · Per-locale review gating + translation ops** — *Director + Claude · M · `SUPERSEDED as a release blocker` (T-177) · deps: T-124 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
  - Translation workflow (MT seed → **native review**, never raw MT for give/protect); a locale
    ships for a country only when reviewed. Per-market rollout order. **Director-gated.**

## F13.3 — Mother-Tongue Dual Display (opt-in)
**Goal:** let a user read species content in the app's primary/country language **and** a second
language of their choice **at the same time** (not by switching) — for immigrants who want to
cross-reference their mother tongue against the country language. Distinct from F13.1/F13.2's
single-active-locale model: this stacks two locales in the same view. **Off by default, Settings
only.**

**Scope resolved (Director, 2026-08-09):**
1. **Translation-quality policy:** machine translation is sufficient — **no native-review gate**
   before a language is offered in the secondary picker, give/protect included. This is narrower
   than F13.2's UI-language-switch policy (T-125, which still requires review before a locale
   becomes the *primary* app language) — dual display is explicitly a supplementary aid shown
   alongside the always-reviewed primary content, not a replacement for it. The one surviving
   requirement is **honesty labeling**: MT content is visibly tagged "machine-translated" so a
   user never mistakes it for reviewed advice (invariant #1). T-152 below records this; T-155 is
   downgraded from a blocker to an optional future quality pass.
2. **Language roster widened beyond the 24 EU languages:** add Sweden's actual top immigrant
   languages even where non-EU. Starter list (Director to confirm/reorder against real
   Statistics Sweden data): **Arabic (ar), Somali (so), Persian/Dari (fa), Pashto (ps), Kurdish —
   Sorani (ckb) + Kurmanji (kmr), Turkish (tr), Tigrinya (ti), Bosnian (bs), Serbian (sr),
   Albanian (sq), Russian (ru), Ukrainian (uk), Thai (th), Vietnamese (vi), Amharic (am)**.
   (Croatian/hr and Spanish/es already cover the EU-language side of former-Yugoslavia and
   Latin-American immigration respectively.) Several of these are **RTL scripts** (Arabic,
   Persian/Dari, Pashto, Sorani Kurdish) — the "24 EU languages are all LTR" assumption in
   [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) no longer holds for this feature; T-157
   below is new work this creates, not an existing gap.

- **T-148 · Dual-language settings state (toggle + mother-tongue pick)** — *Claude · S · `DONE` · deps: T-120, T-124, T-156*
  - ✅ `lib/dualLanguage.ts` (16 tests): `DualLanguageSettings` defaulting to
    `{ enabled: false, secondaryLocale: null }`; `setDualEnabled` (disabling **keeps** the chosen
    language so re-enabling doesn't mean hunting through 40 languages again), `setSecondaryLocale`
    (rejects picking the app's own language — a no-op pairing), `needsLanguageChoice`.
  - ✅ `isDualActive(settings, primaryLocale)` is the single render guard, and **re-checks
    conditions that change after pick time**: the user can switch the app's primary language to the
    one they chose as secondary, and a content-less locale gains content when T-154 seeds it. Every
    failure mode degrades to normal single-language display, never a blank half.
  - ✅ `lib/dualLanguageStore.ts` (12 tests): parse/serialize + in-memory and AsyncStorage stores,
    mirroring `consentStore`. Defensive parse — only a literal `true` enables, and an unknown
    language code (dropped from the roster, or corrupt data) decays to `null` rather than reaching
    the renderer. Device-local, versioned key, no PII.
  - Pure state `{ enabled: boolean; secondaryLocale: ContentLocale | null }` (see T-156 for
    `ContentLocale`), default `{ enabled: false, secondaryLocale: null }` (invariant: no
    pre-enabled features). `secondaryLocale` must differ from the primary display locale
    (rejecting/ignoring the same choice — a no-op pairing). Enabling with no `secondaryLocale`
    chosen forces the picker rather than silently no-op-ing. Tests: default-off, same-locale
    rejection, persisted shape. Not yet in the data-export bundle (`lib/dataExport.ts`) — note the
    gap for when profile/settings export is extended (T-092); the primary locale override has the
    same pre-existing gap today.
- **T-149 · Dual-text formatting core (title "/" join, stacked body)** — *Claude · S · `DONE` · deps: T-148, T-157*
  - ✅ `lib/dualLanguageFormat.ts` (13 tests): `dualTitle` → `"Primary / Secondary"` with each half
    bidi-isolated (T-157), `dualSegments` → body paragraphs in reading order, `hasSecondary`.
  - ⚠️ **Deviation from the planned signature, deliberate:** the body returns *structured segments*
    rather than a `"a\n\nb"` joined string. An RTL secondary needs its own `writingDirection` and
    alignment, which only works if it's a separate `Text` element — a joined string would collapse
    both halves into one run and make the RTL half unstylable, defeating T-157. The title stays a
    string (single line, halves held apart by isolates instead).
  - ✅ Graceful degradation is the tested correctness property: missing / empty / whitespace-only /
    **identical-to-primary** secondary all collapse to ordinary single-language output — no dangling
    delimiter, no blank paragraph, no `undefined` on screen. The duplicate check matters in practice
    (many species names are identical across languages). Single-segment output means callers render
    dual and single-language content through one path.
  - `lib/dualLanguage.ts`: `formatDualTitle(primary, secondary)` → `"Primary / Secondary"`;
    `formatDualBody(primaryText, secondaryText)` → primary paragraph, then secondary paragraph
    (sequential, **not** interleaved sentence-by-sentence, per the brief). Graceful degradation is
    the core correctness property (invariant #1, honest — never a blank/`undefined` second half):
    secondary `null`/missing/equal-to-primary text → title/body render primary-only, no dangling
    delimiter. Bidi-safe when the secondary is RTL (T-157) — the "/" join must not visually corrupt
    either half. Pure + unit-tested (both present, secondary missing, secondary === primary, empty
    strings, RTL secondary).
- **T-150 · Wire dual display into the Species Card** — *Claude · M · `DONE` · deps: T-149, T-059, T-122*
  - ✅ `components/DualText.tsx` renders each half as its own `Text` with that half's writing
    direction/alignment, so an RTL paragraph reads correctly inside the otherwise-LTR card. The
    mother tongue is set apart by a left rule + muted colour — an aid beside the primary, never
    mistakable for one continuous paragraph.
  - ✅ `SpeciesCard` takes `secondaryContent`/`secondaryLocale`; the title uses `dualTitle` and
    fact/when-how/give/protect each go through `DualText`. Degradation is **per field**, so a
    partially-translated species shows the mother tongue for the fields that have it rather than
    all-or-nothing. `App.tsx` loads the secondary through the same repository seam, keyed by species
    id **and** locale so a slow read can't paint onto the wrong card or a just-changed language;
    the whole read is skipped when the feature is off (no cost to the default experience).
  - ✅ Machine-translated content carries a notice naming the language in its own script
    ("Svenska · Machine-translated"), shown once per card rather than repeated per section (T-152).
  - ✅ 6 new card tests incl. a real-Arabic case asserting the secondary gets `writingDirection:
    'rtl'` while the primary stays `ltr`, and give/protect appearing in both languages.
  - ✅ `SpeciesRepository.getContent` widened to `ContentLocale` (content exists in the wider
    roster; `listSpecies` stays on `Locale` since names follow the UI language).
  - `SpeciesCard` renders the common name via `formatDualTitle` and each body section (fact,
    when/how, give, protect) via `formatDualBody` when `dualLanguage.enabled`. Falls back to
    primary-only per species/field when the secondary locale has no content for that field —
    mirrors the existing English-fallback chain, just for the secondary slot. An RTL secondary
    paragraph gets its own text alignment/writing-direction (T-157) without flipping the rest of
    the (LTR) card. Selection-logic unit tests (picks the right content pair; handles a species
    missing secondary content entirely); on-device layout unverified per this repo's
    component-testing convention.
- **T-151 · Settings UI: toggle, language picker, "off" discoverability hint** — *Claude · S · `DONE` · deps: T-148, T-156*
  - ✅ New "Second language" section in `SettingsScreen`, toggle OFF by default. While off, a
    quiet **info box** (🌍 + one honest line) tells the user the option exists — no modal, no badge,
    no repeat nagging (invariant #4 spirit). It's replaced by the picker once enabled, having done
    its job.
  - ✅ Picker lists `dualDisplayLocales()` minus the app's own language, each row showing the
    language's **endonym** (Svenska, العربية, ትግርኛ) — someone looking for their language scans for
    its native name. Machine-translated languages carry an `MT` tag **at choice time**, not only
    later on the card, plus a one-line caveat under the list (T-152 honesty).
  - ✅ 6 tests incl. off-by-default + info-box-instead-of-picker, endonym-not-exonym, and that the
    app's current language is never offered as its own secondary.
  - ⚠️ **The picker is short until T-154 seeds languages** — only locales with real content are
    listed, since offering a language that would render nothing is exactly the dishonesty this
    feature is supposed to avoid. Today that means en/sv; each T-154 language makes it longer.
  - New Settings section (below `settings.language`) with the toggle OFF by default and a picker
    across the full `ContentLocale` roster (T-156: 24 EU + the priority immigrant list) once ON —
    grouped or ordered so the ~15 added languages don't bury the EU list. Uses the widened T-156
    coverage tracking, not `ALPHA_LOCALES` (the primary-language switcher's alpha-only set stays
    unchanged — this picker is additive, not a replacement UI-language list). While OFF, show one
    quiet, honest info row noting a second language is available — no modal, no repeat nagging, no
    red dot (invariant #4 spirit). Copy is honest about MT quality (machine-translated, not
    "translated") — ties to T-152.
- **T-152 · Translation-quality policy for the secondary language** — *Director + Claude · S · `DONE` · deps: T-124*
  - ✅ **Resolved (2026-08-09):** machine translation is sufficient for dual display — no
    native-review gate, give/protect included. Dual display is a supplementary aid alongside the
    always-reviewed primary content, not a replacement for it, which is why this is a narrower bar
    than T-125's UI-language-switch policy. Surviving requirement: secondary content **must carry
    a visible "machine-translated" indicator** (invariant #1 honesty) so it's never mistaken for
    reviewed advice. Recorded here and to be folded into
    [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) as a documented exception to the "never ship
    unreviewed give/protect" rule, scoped explicitly to this supplementary-display feature.
- **T-153 · Extend content-honesty enforcement to the dual-display path** — *Claude · S · `DONE` · deps: T-152, T-066, T-156*
  - ✅ `contentHonesty.ts` keyed by `ContentLocale`; new `hasHonestyPhrasesFor(locale)`.
  - ✅ **The hole this closes:** `findRealtimeClaims` falls back to the *English* phrase list for an
    unknown locale, and English substrings never match Arabic or Tigrinya text — so a language
    shipped without its own banned phrases would pass the honesty suite **vacuously**, reporting
    "honest" without examining a word. A test now fails the build for any offerable locale missing
    its phrase list, so T-154 must add phrases alongside each language's content. A second test
    documents the trap directly (Arabic "here now" is *not* caught by the English list).
  - ✅ Invariant test: every offerable locale is either `reviewed` **or** carries the
    machine-translated notice — never unlabelled-and-unreviewed (T-152's one surviving requirement).
    Plus: a `missing`-status locale is never offered.
  - `contentHonesty.ts`'s real-time-presence-phrase check extends to every locale offered in the
    secondary picker (T-156 roster) as that locale's content lands; add a check that secondary
    content always carries the machine-translated indicator per the T-152 policy (labeling is
    enforced; review status is not — see T-152).
- **T-154 · Machine-translate species content into the full dual-display roster** — *Claude + Director · XL · `DONE` (16 immigrant + 20 EU languages; ga/mt cut — T-159) · deps: T-127, T-156*
  - ✅ **All 16 immigrant-roster languages seeded**, one push each, in immigrant-population order:
    Arabic, Somali, Persian/Dari, Tigrinya, Sorani Kurdish, Turkish, Bosnian, Serbian, Albanian,
    Russian, Ukrainian, Pashto, Kurmanji Kurdish, Thai, Vietnamese, Amharic. Each is 54 species ×
    4 fields plus common names, registered at `machine` status with its own banned-phrase list
    (required by T-153, else the honesty suite passes vacuously).
  - ✅ Picker now offers **18 languages** (en, sv + the 16). Scripts covered: Latin, Arabic (RTL),
    Cyrillic, Ge'ez, Thai — exercising the T-157 direction table for real.
  - ✅ Serbian was **derived** from Bosnian rather than translated afresh (same language system;
    the honest differences are script and jat reflex). Transliteration is mechanical; the
    ijekavian→ekavian pass used a curated word list built from the words actually present, since
    "je" is root-internal in many words (jesen, jezero, -anje nouns) a regex would corrupt.
  - ✅ **20 of the 22 remaining EU languages seeded**, one push each: Polish, German, Finnish,
    Danish, Croatian, Spanish, Dutch, French, Italian, Portuguese, Romanian, Greek, Hungarian,
    Czech, Slovak, Bulgarian, Lithuanian, Latvian, Slovenian, Estonian. Picker now offers **38
    languages**. `EXPECTED_SCRIPT` in the T-158 suite gained Greek and a Bulgarian Cyrillic entry.
  - Croatian was **derived** from Bosnian (same ijekavian Latin system — only genuine lexical
    divergences substituted, deliberately a short list). Slovak was **not** derived from Czech:
    the species nomenclature diverges (mlynárik/bělásek, záružlie/blatouch), so a mechanical
    conversion would have produced plausible-looking wrong names.
  - ✂️ **Irish (ga) and Maltese (mt) cut** — see T-159. 36 of the 38 roster locales ship.
  - The volume item flagged in INTERNATIONALIZATION.md, now spanning the 24 EU languages **and**
    the T-156 priority immigrant list (~39 locales total). Mirrors T-127's per-locale approach;
    registers each at `machine` status in the coverage matrix — per T-152, `machine` is sufficient
    to ship in dual display (unlike a primary-language switch, which still needs `reviewed`, T-125).
    Can stage language-by-language, immigrant-priority languages first per T-156's ordering. Not a
    blocker for shipping T-148–T-151 — the picker is usable (degrading gracefully) with just en/sv
    seeded.
- **T-159 · Irish and Maltese species content** — *Claude + Director · M · `CUT` (Director decision, 2026-08-10) · deps: T-154*
  - Blocked on a **names** problem, not a translation one. Most of the 54 Kronoberg species do not
    occur in Ireland and almost none occur in Malta, so there is no established Irish or Maltese
    common name for a large share of the list. Writing 54 plausible-sounding coinages per language
    and shipping them at `machine` status would put invented names in front of readers under the
    same label as the checked ones — the picker rule exists precisely to stop a language from
    rendering something that looks authoritative and is not.
  - ✅ **The sourcing step is now built, not pending research** — `pipeline/build_vernacular_names.py`
    plus `pipeline/vernacular/` generate `lib/species/names.<locale>.ts` from Wikidata taxon common
    names (P1843), falling back to the locale's Wikipedia article title. 13 offline tests
    (`pipeline/tests/test_vernacular.py`) pin the rules that matter: a "common name" equal to the
    binomial is rejected (both sources fall back to Latin when no vernacular exists), an explicit
    P1843 statement beats an article title, output is deterministic, and a **partial module is
    refused outright** — `contentInLocale` has no English fallback by design, so a locale missing
    names renders blank halves.
  - 🔴 **Remaining blocker is environmental, not technical.** `query.wikidata.org`,
    `en.wikipedia.org`, `www.teanglann.ie` and `api.gbif.org` are all refused (403 at the proxy
    CONNECT) by this session's egress policy, so the generator cannot run here; it exits 2 with a
    plain message rather than a traceback. Unblock by running it where Wikimedia is reachable and
    committing the output, or by widening the egress allowlist. WebSearch is *not* a substitute —
    it returns paraphrase, and mistranslated *clamhán* (buzzard) as "thyme" when tried.
  - ✂️ **Cut (2026-08-10):** Director's call is to leave Maltese unregistered and drop Irish for
    now. Neither locale is seeded, so both stay `missing` in `LOCALE_STATUS` and the picker simply
    does not offer them — no app change was needed, because that is already how the roster degrades.
    `contentLocale.test.ts` now pins this by name so a future half-seeding fails loudly instead of
    quietly putting coinages in the picker.
  - The generator stays on the shelf, tested and ready: if this is revisited, run it where Wikimedia
    is reachable and the names arrive sourced rather than authored. The remaining judgement call is
    unchanged — species with genuinely no Maltese name would still need dropping from the locale.
  - Both are EU official languages, so leaving them out is a real gap — but the honest failure mode
    is a shorter picker (the language is simply not offered), which is how the roster is designed
    to degrade.
- **T-160 · Seed species_content for every content locale** — *Claude · S · `DONE` · deps: T-154*
  - 🐛 **Found by inspection, not by a failing test:** the database held only en and sv (108 rows).
    `scripts/gen-species-seed.ts` imported those two locales by name, so the 36 locales T-154 added
    never reached Postgres. Invisible on the app's default `HardcodedSpeciesRepository` path, which
    is why the whole dual-language feature tested green while being broken against Supabase:
    `SupabaseSpeciesRepository.getContentInLocale` deliberately has **no** English fallback (the
    mother-tongue half must never quietly show a third language), so the secondary half would have
    rendered nothing for every locale but en/sv.
  - ✅ **No DDL was required.** `species_content.locale` is plain `text` with no check constraint —
    the 0004 schema already accepted these rows. This was a data gap, not a schema gap.
  - ✅ Generator now drives off `CONTENT_BY_LOCALE` / `NAMES_BY_LOCALE` instead of a hand-written
    locale list, so registering a locale is what seeds it — there is no second list to forget.
  - ✅ `supabase/migrations/20260810000001_seed_species_content_all_locales.sql` — 2052 rows
    (54 species × 38 locales), idempotent (`on conflict do update`), one transaction.
  - ✅ `pipeline/tests/test_seed_migration.py` (5 tests) fails the build if the migration and the
    registry ever diverge again, and checks quote-escaping by parity — an unescaped apostrophe
    would not raise, it would insert garbage via syntactically valid SQL.
  - 🐛 **The live DB was worse than assumed.** Once the Supabase connector was enabled, project
    `Nearlife` (subjdoiicfmiimtvlzsg, eu-central-1) turned out to hold **4** species_content rows —
    only `common-swift` and `barn-swallow`, in en and sv. `species` was complete at 54. So the
    original 0005 seed had only ever been partially applied; every locale was short, not just the
    36 new ones.
  - ✅ **en and sv applied and verified: 54/54 each, no null names, no empty fields.** These are the
    two primary UI locales (T-125), so the primary content path is now whole.
  - ✅ **Applied: en, sv, so — 54/54 each**, verified with no null names and no empty fields.
  - ⏳ **33 locales still unapplied.** Not a permissions or schema problem — a context one: the SQL
    must pass through the model's context to reach a tool call, and the remaining ~860 KB of compact
    upserts is roughly 240k tokens. Finish with `supabase db push`, where the file never enters a
    context, or apply per-locale across sessions.
  - Note for whoever finishes it: applying per-locale is safe in any order. Every statement is an
    idempotent upsert and `species` (the FK target) is already complete.
  - 🔎 **Migration history is out of step with the repo.** `list_migrations` shows 5 applied, with
    version stamps that do not match the filenames (e.g. `20260705183144` vs
    `20260705000001_harden_rls_auto_enable_grants.sql`) — they were applied ad-hoc via
    `apply_migration`, not `db push`. The un-recorded ones (`seed_species`,
    `seed_kronoberg_presence`, and this task's seed) are all idempotent, so a later `db push` is
    safe, but the history should be reconciled before anyone relies on it.
  - ✅ **T-146's DDL was missing from the live DB** and has now been applied: `species_content.fact`
    was still `NOT NULL`, so the mission-only rows T-146 exists to allow would have been rejected
    outright. `give`/`when_how`/`protect` remain `NOT NULL`, which is the intended shape.
- **T-165 · Offline-first collection writes (outbox + local source of truth)** — *Claude · L · `DONE` · deps: T-027, T-116*
  - 🔴 **Today a catch made without signal is silently lost.** `useCollection.spot/markCaught/help`
    call the store and end in `.catch((e) => console.warn(...))` — the write goes straight to
    Supabase, the failure is swallowed, `refresh()` never runs, so the UI does not update and
    nothing is queued. There is no retry and no local copy. `markCaught` is worse than a blind
    write: it does a read-modify-write (`selectOne` then `upsert`), so offline it fails at the read.
  - This lands on the exact moment the product cares most about. Invariant #4 keeps collect,
    catch-success and help clean of upsell; a tap that appears to do nothing and then loses the
    record is a far worse violation of that spirit than any upsell would be.
  - It also lands where the app is *actually used*: Kronoberg forests, wetlands and lake shores —
    precisely where signal is worst. Requiring the network at the moment of a catch inverts the
    product.
  - Fix: make the device the source of truth. Write to a local store (AsyncStorage, mirroring
    `consentStore`/`dualLanguageStore`) synchronously, render from it, and drain an append-only
    outbox to Supabase in the background with retry/backoff. Fall back to the current path only
    when the outbox is empty.
  - Merge is easy here and does **not** need a CRDT: a collection row is per-species with monotonic
    one-way timestamps (`spotted_at` → `caught_at` → `helped_at`, plus `prime_bonus`). Field-wise
    earliest-non-null-wins converges regardless of delivery order, which also makes the outbox
    safely re-drainable after a crash.
  - Note `InMemoryCollectionStore` is the fallback when Supabase config is absent — it loses
    everything on restart. Local persistence fixes that case too, so the app is honest offline
    rather than merely quiet.
  - ✅ `lib/collectionMerge.ts` (10 tests): field-wise earliest-non-null-wins, with commutativity,
    associativity and idempotence pinned as explicit tests — those three properties are the whole
    argument for not needing a CRDT, so they are asserted rather than assumed. `primeBonus` and
    `helpedKind` travel with the timestamp that won instead of merging independently; OR-ing
    `primeBonus` would award a bonus for a catch that never happened in the active window.
  - ✅ `lib/offlineCollectionStore.ts` (13 tests): local cache + append-only outbox behind the
    existing `CollectionStore` interface, so it drops in with no screen changes. Writes return
    immediately and **cannot reject**; a mid-queue failure drops only what the server accepted;
    draining twice is a no-op; corrupt cached JSON decays to empty rather than losing the session;
    reads never touch the network.
  - ✅ Wired into `components/useCollection.ts`. Mount order is now hydrate → render → sync, so the
    UI is correct from on-device state before any network work, and last session's undelivered
    writes drain in the background.
  - 🐛 Found while building: a boolean `syncing` re-entrancy guard made an explicit `sync()` a
    silent no-op whenever the fire-and-forget sync from a write was still in flight — so coming
    back online right after a failed write left the queue sitting until the next write happened to
    trigger it. Replaced with a serialised promise chain; three tests covered it.
  - `App.test.tsx` needed `AsyncStorage.clear()` in `beforeEach`: the collection now genuinely
    survives between renders, so it also survived between test cases.
  - ✅ **Drains on app foreground too** (`AppState` listener in `useCollection`, 3 tests in
    `components/useCollection.test.tsx`). Without it the outbox only moved on a write or a cold
    start, so a catch made in a forest would stay queued even after the user walked back into
    signal — they would have had to catch something else to push it out. `AppState` ships with
    React Native, so this added no dependency (a connectivity library like NetInfo would have).
  - Deliberately untested: that unmount calls `subscription.remove()`, and that the handler ignores
    non-active states. The effect returns `() => subscription.remove()`, so the first is React's
    cleanup contract rather than our logic; and React Native subscribes to `AppState` internally,
    so neither spying on the last subscription nor replacing `addEventListener` isolates ours —
    stubbing it wholesale hangs the render. Noted in the test file so the gap is deliberate rather
    than forgotten.
- **T-166 · Ship content per-locale instead of bundling all 38** — *Claude + Director · M · `TODO` · deps: T-160, T-057*
  - Content is already offline-first — it is bundled — but every user downloads **all 38 locales**
    (~761 KiB of field text) to read at most two. That is the cost of the current approach, and it
    grows with every locale added.
  - Preferred shape: keep the **primary** locale bundled so a cold install works with zero network
    (a nature app must not need signal at first run, and onboarding is the worst place to add a
    network dependency), and fetch the **secondary** dual-display locale on demand, caching it
    locally on first use. That keeps T-166 and T-165 consistent: device-first, network as a
    top-up.
  - Depends on T-160 completing: fetching a locale that is not seeded returns nothing, and
    `getContentInLocale` has no English fallback by design.
  - Cheap on the backend either way — see the storage/egress figures under T-057.
- **T-167 · v1 scope: all Nordic species, fauna and flora** — *Claude + Director · XL · `IN-PROGRESS` · deps: T-042, T-136*
  - 🔭 **Director decision (2026-08-11): v1 covers the five Nordic countries** — Sweden, Norway,
    Denmark, Finland, Iceland — showing as many genuinely encounterable species as possible, fauna
    and flora, with noise filtered. This supersedes the 54-species Kronoberg prototype (T-019) as
    the shipping catalogue; that set remains the curated quality benchmark.
  - **Why the 54 was never the ceiling:** Kronoberg alone has 3,018 recorded species, 1,295 with
    >100 observations and 425 with >1,000. Birds alone: 357 recorded, 179 with >1,000 observations
    against 17 in the app. Someone spotting a nuthatch finds nothing — a product problem, not a
    backlog item.
  - ✅ **Regions are now Nordic-wide and fetched, not guessed** (`gbif/counties.py`, 9 tests).
    Sweden's 21 counties stay checked in (verified, in use, and they double as the parser fixture);
    the other four countries resolve through `/geocode/gadm/<ISO3>/subdivisions` at ingest time.
    Hardcoding unverified GADM ids would not fail — it would slice occurrences by the wrong region
    and emit well-formed wrong data.
  - ✅ **Country filter derived from the GADM id** (`gbif/client.py`), replacing a hardcoded
    `country=SE`. Asking for a Norwegian region while filtering on Sweden returns zero rather than
    an error, so the two must never be able to disagree. Adds `GbifClient.subdivisions()`.
  - ⚠️ **"The ingest is now runnable" was wrong when written** (corrected by T-173: the first
    real dispatch died instantly on a signature mismatch). `build_presence.py` takes `--country <ISO3>` (Sweden keeps
    its checked-in regions and its existing filenames; other countries fetch subdivisions and write
    `presence_<taxon>_<ISO3>.json`), and the `Data pipeline` workflow gained a `countries` input, so
    it is a workflow_dispatch away rather than a code change. Previously `build_presence.py` was
    hardcoded to Sweden **and in no workflow at all** — the existing Swedish data had been generated
    off-repo.
  - ✅ **The load path is country-agnostic too.** Three defects would each have wasted the ingest
    *after* it ran: `load_datasets` fed `birds_NOR` straight into `TAXON_MAP` (KeyError); the
    loader inserted only Sweden's 21 counties, so every non-Swedish presence row violated
    `species_presence.region_id`'s FK and rolled back the whole transaction; and region names for
    fetched subdivisions fell back to their gid. Regions are now derived from the presence records
    themselves (`db_rows.regions_from_records`) — a country's ingest carries its own regions, so a
    presence row can never reference a region that was not inserted. `taxon_key_for` strips the
    ISO3 suffix and **raises** on one we never wrote rather than mis-keying the taxon.
  - ⏳ **Next, in order:** (1) dispatch `Data pipeline` with `countries: NOR DNK FIN ISL` — hours per
    country, which is why it belongs in Actions rather than a laptop or a chat session; (2) T-136 noise filtering, now per-country
    (Artdatabanken/Dyntaxa SE, Artsdatabanken NO, Allearter DK, FinBIF/laji.fi FI,
    Náttúrufræðistofnun IS); (3) content generation at scale; (4) T-166 becomes mandatory —
    bundling dies at this size.
  - 📐 **Scale to plan against:** Sweden alone is 11,908 species / 78,530 records. Five countries
    plausibly 20–30k distinct species. At 38 locales that is ~1M content rows and a few hundred MB
    — still inside the 500 MB free tier, but the end of shipping content in the app bundle.
  - ⚠️ **Content is the dominant cost, and the Director's bar is high:** generated everywhere, but
    rewritten into the card voice, from official sources, verified per species. The mammals pilot
    (157 species) shows the gap — its facts are Wikipedia lead sentences, and its give/protect are
    taxon templates rather than per-species advice. Meeting this bar across ~25k species is the
    single largest piece of work in the project and needs its own plan before it is attempted.
- **T-171 · Delete the superseded `pipeline.yml`; preflight the secrets** — *Claude · S · `DONE` · deps: T-167*
  - Two workflow files both declared `name: Data pipeline`, so the Actions sidebar listed the same
    entry twice with no way to tell which was which — and the wrong one has no `countries` /
    `content_scope` inputs, so picking it silently offers a different job.
  - `pipeline.yml` was the T-015 skeleton: it runs `pipeline/run.py`, which prints "skeleton OK"
    and returns. Harmless on its own — but it also carried `cron: '0 3 1 * *'` and a real
    `gbif.supabase_load` step, so it would have started writing to the production database
    unattended on the 1st of every month the moment `SUPABASE_DB_URL` was set. Deleted.
  - **The monthly refresh cadence is intentionally not carried over** (see T-172). A six-hour
    unattended GBIF ingest on a schedule is a thing to switch on deliberately, once the ingest has
    proven itself once by hand — not something to inherit from a skeleton.
  - ✅ `data-pipeline.yml` gained a **preflight step**: it prints which of the three secrets are set
    (names only, never values) and echoes the chosen inputs, in seconds. The load steps skip
    silently when their secret is missing, and until now that only became visible at the end of a
    multi-hour ingest that then had nowhere to write.
- **T-173 · `build_for_taxon` signature mismatch killed every ingest** — *Claude · S · `DONE` · deps: T-167*
  - The first real dispatch of the Nordic ingest (run 32116035308, `NOR`) failed in **one second**:
    all nine taxa raised `build_for_taxon() takes 2 positional arguments but 3 were given`.
  - T-167 threaded the region list through the function body and both call sites but never changed
    the signature. Sweden was broken by this too — the bug was not Nordic-specific, and the
    checked-in Swedish data predates it, so nothing showed.
  - **Why nothing caught it:** `build_presence.py` is almost entirely network I/O and had *no test
    file at all*. T-167's nine tests covered `counties.py` and the parser, which is what made the
    module look tested. `pipeline/tests/test_build_presence.py` now drives `build_for_taxon` with
    a fake client: it cannot check GBIF's answers, but it does check the function is callable as
    called and walks the regions it was handed.
  - Also removed three `regions or SWEDISH_COUNTIES` fallbacks. A country resolving to an empty
    region list would have silently ingested Sweden and written it under that country's filename —
    exactly the well-formed-wrong-data failure T-167 exists to prevent. Empty regions now produce
    an empty result, loudly.
  - ✅ **Confirmed working from the same run:** `[presence] country=NOR regions=19` — the GADM
    subdivisions endpoint resolves and Norway's 19 counties come back fetched, not guessed.
- **T-174 · Explain the connect failures that are configuration, not outages** — *Claude · S · `DONE` · deps: T-167*
  - The first Nordic load failed with `connection to server at "2a05:d014:415:500:…", port 5432
    failed: Network is unreachable` — which reads like the database is down, and is not. Supabase's
    **direct** host `db.<ref>.supabase.co` resolves to **IPv6 only**, and GitHub Actions runners
    have no IPv6, so a direct connection can never work from CI whatever the password is. Working
    that out from a raw traceback cost a round trip; it should not cost the next one.
  - `gbif/connect.py` (`connection_hint`, 6 tests) recognises the two connection-string mistakes we
    can actually hit and prints the fix. Both loaders now wrap `psycopg.connect` and append the
    hint. It stays silent on anything it does not recognise — a wrong password must not be reported
    as a network problem, and an unreachable *pooler* is a real outage, not a wrong choice.
  - Also corrects both loaders' docstrings, which recommended `pooler.supabase.com:**6543**` —
    transaction mode. psycopg3 promotes repeated statements to prepared ones and PgBouncer's
    transaction mode rejects them, which both loaders would hit on their `executemany` over
    thousands of rows. **Session pooler, port 5432** is the correct target.
- **T-176 · `Database migrate` workflow — apply migrations without the CLI** — *Claude · M · `DONE` · deps: T-160, T-174*
  - `supabase db push` needs the CLI and a linked project on a laptop, and the migration that
    actually matters (`20260810000001`, the all-locales content seed) is **1.5 MB** — far too large
    to move through a chat session. `.github/workflows/db-migrate.yml` runs the same job from
    Actions against `$SUPABASE_DB_URL`, so it is a dispatch rather than a local toolchain.
  - **Three modes, `plan` the default.** `plan` reports and never writes; `apply` runs each pending
    migration **in its own transaction** and records it; `repair` stamps versions as applied without
    executing them.
  - `repair` is not a convenience — it is required here. The live history was written by the MCP
    tool, which stamps its own timestamps, so six files' contents are applied under versions that do
    not match their filenames (e.g. `20260705000001` is live as `20260705183144`). Without repair,
    `apply` re-runs DDL that is already in place.
  - A version recorded in the database with no local file is **ignored, not reported as drift**: it
    is history from another tool, not work to do. Tested (`test_migrate.py`, 6 tests) because
    getting this wrong either re-runs DDL or silently skips the one migration that matters.
  - One transaction per migration rather than one for the batch: a failure then leaves that
    migration entirely unapplied *and* unrecorded, instead of half-done under a stamp claiming it
    succeeded.
  - ✅ **Validated against the live project** (run 32117992455, `plan`, wrote nothing). It reports
    **7 pending**, which confirms the diagnosis exactly: six are already live under MCP stamps and
    want `repair`; `20260810000001_seed_species_content_all_locales` has genuinely never run and
    wants `apply`.
  - That run also exposed a gap in the first cut: a mode alone applies to *everything* pending, so
    `repair` would have stamped the content seed as done without ever running it, and `apply` would
    have re-run six migrations of live DDL. Both modes now take an optional version list, and a
    version that is not pending **raises** rather than being skipped — silently ignoring a typo
    would report success having done nothing.
  - The `versions` input is free text, so it is passed through the environment rather than
    interpolated into the run command; `${{ }}` expands before the shell sees it, which would make
    a dispatch input executable. `mode` is a `choice` input and constrained to its enum.
- **T-177 · Director decision: v1 is Sweden, noise filter is the only quality gate** — *Director · — · `DONE` · deps: T-136, T-167*
  - 🔭 **Director, 2026-08-18, final:** v1 ships **Sweden only**, and **every species that passes
    the T-136 noise filter ships** — no per-species human verification, no review tier, no review
    queue. Content is treated as shipping-quality as generated. This supersedes the review gates in
    T-125 and T-155 as *release blockers*; they remain available as later quality work.
  - **The numbers that support it.** Of Sweden's 11,908 species the filter keeps **6,824 (57.3%)**
    and drops 5,084 — and the kept set carries **99.63% of all observations**. Everything dropped
    accounts for 0.37%. A human-verified tier was proposed and rejected: it would have bought
    encounter coverage the filter already delivers to within a third of a percent.
  - ❌ **Rejected on the way here:** a flat "≥10,000 observations = verified" tier. Testing it
    against the human-curated 54 showed it drops the **western honey bee**, the badger and the red
    wood ant, and verifies **zero arachnids** while verifying 39% of birds — observation count
    measures recording culture, not encounterability. Rank-within-taxon fixed that bias but the
    whole tier was then made moot by this decision. Recorded because the bias is real and will
    resurface anywhere occurrence counts are used as a proxy for "common".
  - **Scope effect:** ~25,000 species across 5 countries → **6,824 in 1 country**. Presence data is
    already ingested and loaded. NOR/DNK/FIN/ISL become v2.
  - ✅ **Also decided (T-178):** the dual-language second locale is **free**, and the full
    immigrant-language roster is v1 scope.
- **T-178 · Dual-language second locale is FREE** — *Director · S · `DONE` (decided 2026-08-18) · deps: T-154*
  - 🔭 **Director, final:** the second content language is **free for every user**. All content must
    be translated into the full immigrant-language roster at no charge. The €2 unlock is dropped.
  - A **€2 one-time unlock** was floated and rejected. Reasoning, kept because it constrains
    future monetization proposals: the dual-display roster is deliberately *Sweden's immigrant
    languages* (Arabic, Somali, Persian/Dari, Pashto, Kurdish ×2, Tigrinya, Bosnian, Albanian,
    Ukrainian…), per [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md). Pricing it means a
    Swedish reader gets the whole app for free while a resident who cannot read Swedish pays to
    understand any of it — charging for comprehension rather than for depth. It also sits against
    **invariant #2** ("mission never gated"): give/protect behind a language wall is gated for that
    user, whatever the flag says. And it adds a second axis to a deliberately one-axis model
    (Free → Full Game $9.99, [ECONOMY.md](ECONOMY.md)).
  - There is also **no enforceable distinction** between a Somali speaker who needs Arabic and a
    Swede who wants Spanish for fun — both just pick a second language in Settings. So the only
    implementable lines are free-for-all or paid-for-all.
  - **Monetization stays on one axis** (Free → Full Game $9.99) and grows through v2 region packs
    ("Norwegian species, in your language") — charging for *breadth*, never for comprehension.
  - **Consequence for the build:** the immigrant-language roster is now v1 scope, not a nice-to-have.
    Translating all shipped content into all 16 is required work — see T-179/T-180.
- **T-179 · Source facts per language instead of translating them** — *Claude · S · `DONE` · deps: T-178*
  - With the immigrant roster in v1 scope and free (T-178), every shipped species needs a `fact` in
    ~18 languages. Machine-translating 6,824 English facts per language is ~120k translations, and
    it produces *worse* prose than the alternative: **every Wikipedia edition already holds these
    species under the same scientific name**, written natively, under the same CC BY-SA we already
    attribute.
  - `fetch_extract(name, lang)` now selects the edition, so the per-species half of the translation
    job costs **nothing per species** — it is a fetch, not a generation. Only the templates
    (T-180) are actually translated.
  - `wiki_api_for()` validates the code rather than interpolating it: the language goes into a URL,
    so an unchecked value is a request to an arbitrary host. Locale forms reduce to their language
    (`pt-BR` → `pt`) because Wikipedia is keyed by language and `pt-BR.wikipedia.org` does not
    exist. 6 tests.
  - Returns None when an edition lacks the article rather than falling back silently.
    `species_content.fact` is nullable for exactly this (T-146) and give/protect are template-based,
    so a missing fact never gates the mission (invariant #2).
  - ⚠️ **Known quality caveat, not a blocker:** Swedish Wikipedia's species articles are largely
    Lsjbot-generated stubs ("*X är en art i familjen Y som beskrevs av Z 1857*") — accurate,
    correctly licensed, and duller than the English equivalents. Better to know this now than to
    discover it in the app.
- **T-180 · Localised give/protect/habitat templates + season phrasing** — *Claude · M · `DONE` (all 18 locales) · deps: T-178, T-179*
  - `give`, `protect` and the habitat half of `whenAndHow` are **taxon templates, not per-species
    text** — so ~46 strings translate all three fields for every one of the 6,824 shipped species.
    With facts sourced per language (T-179), `media/templates_i18n.py` **is** the translation job.
    Adding a language is one entry in `LOCALES` and nothing else.
  - **The season phrase is deliberately not a translated string.** English composes it — "from May
    to September" — and that breaks wherever a month inflects after a preposition. Each locale
    supplies **three** month lists, one per slot: Russian is the proof — "в мае" (list), "с мая"
    (from), "по сентябрь" (to) are three different forms of one month. A two-list model looked
    sufficient right up until a Slavic language was actually written out, which is the argument for
    doing the hard locales early rather than last.
  - **An unregistered locale raises rather than falling back to English.** Silently serving English
    to a Somali reader looks like success and is the failure the whole feature exists to prevent.
  - 11 tests, run over **every** registered locale — full taxon coverage, 12 months in both forms,
    no empty strings, both `{when}` and `{hint}` slots preserved, and content that differs from the
    English table (which catches a locale registered by copying English in as a placeholder).
  - ✅ `en` output is pinned to the original wording so the refactor cannot drift it.
  - ✅ **ar** and **so** written — the two largest immigrant-language communities in Sweden, and
    the two that most need this feature. These are conservation and access instructions, i.e.
    general prose; species *nomenclature* remains a sourcing problem (T-159), and nothing here
    invents a name.
  - ✅ **ru** and **uk** written next on purpose: they are the locales that exercise the
    three-form month model, so the design is proven by real inflection rather than by assertion.
    Output verified by hand — `с мая по сентябрь` / `в марте, октябре`, `з травня до вересня` /
    `у березні, жовтні`. Ukrainian takes the genitive in *both* range slots (з/до), Russian does
    not (с + genitive, по + accusative) — which is exactly why the two slots are separate fields.
  - ✅ **fa** and **tr**. Turkish stretched the model a third way: its case endings are
    vowel-harmonised suffixes on the month itself, so the three lists carry locative, ablative and
    dative forms and the range pattern is bare — `{first} {last}` gives `Mayıs'tan Eylül'e`. Persian
    does not inflect months at all, so all three lists coincide. One data model has now absorbed
    Germanic, Slavic, Turkic and Semitic-script languages without a special case.
  - ✅ **bs**, **sq**, **vi**. Bosnian takes the genitive in both range slots (od maja do
    septembra) and the locative in the list (u martu) — the Slavic pattern again; Albanian and
    Vietnamese do not inflect months at all.
  - 🐛 **Invisible-character guard added, then corrected.** A soft hyphen typed into the Bosnian
    reptile habitat rendered as nothing and would never have been caught by eye — the same class of
    bug as the Cyrillic `ј` found inside a Slovenian word earlier. The first fix stripped *all*
    zero-width characters and silently removed **92 ZWNJ from Persian**, where they are load-bearing
    orthography (`زمان‌های`). The test now bans only the meaningless ones (soft hyphen, ZWSP, BOM,
    word joiner) and explicitly permits ZWNJ/ZWJ, with the reason recorded in its docstring so the
    blanket strip is not attempted again.
  - ✅ **sr**, **th**, **am**. Serbian is written in **Cyrillic**, not Latin: it is the official
    script, and a Latin Serbian table would have been near-identical to the Bosnian one — two
    locales that differ only in a handful of words look like a copy-paste placeholder and would have
    passed the differs-from-English check while telling a reader nothing new. Thai and Amharic do
    not inflect months; Serbian follows the Slavic pattern (locative in the list, genitive in both
    range slots).
  - ✅ **ti, ckb, kmr, ps** complete the roster — **18 locales**, ~46 strings each, covering
    `give`, `protect` and `whenAndHow` for all 6,824 shipped species. RTL needs no special handling
    here — these are data strings; mixed-direction *rendering* is T-157.
  - 🐛 **Kurmanji shipped a doubled preposition for one commit**: the pattern prefixed `Li` while
    every habitat string already begins with `li`, giving "Li li perên daristanan". Every
    conformance check passed, because each string is correct in isolation — only the *composition*
    was wrong. A test now walks the composed sentence for every locale × taxon × season shape and
    rejects adjacent repeated words. The lesson generalises: per-field checks cannot see a
    composition bug.
  - ⚠️ **Confidence is not uniform across the roster.** ar, so, ru, uk, fa, tr, bs, sr, sq, vi, th
    are written with high confidence; **ti, ckb, kmr, ps, am** are plausible and grammatical but
    warrant a native pass before they are held up as polished. They are conservation instructions
    rather than nomenclature, so nothing here can invent a species name — the failure mode is
    stiffness, not falsehood. T-155 is the (non-blocking) home for that pass.
- **T-181 · `build_content` emits one row per (species, locale)** — *Claude · M · `DONE` · deps: T-179, T-180*
  - The step that actually uses T-179 and T-180. Before it, the pipeline emitted English-only rows
    and the free immigrant roster (T-178) had nothing to load.
  - `build_localized(species, taxon, client, locales)` fetches each locale's fact from **that
    language's Wikipedia** and takes give/protect/whenAndHow from that locale's templates.
  - **A missing article leaves the fact null and does not fall back to English.** Unlabelled English
    prose inside a Somali card is worse than no fact, and the card already handles an absent one
    (T-146). give/protect/whenAndHow are template-based, so they are present in every row whatever
    Wikipedia has — a language gap can never gate the mission (invariant #2). Tested explicitly.
  - `needsReview` is now **False** and `curationStatus` is `noise-filtered`, matching T-177: the
    filter is the quality bar, and leaving a review flag set would have implied a gate that no
    longer exists.
  - 7 tests against a fake client — no network — asserting the per-language fetch actually happens
    per language rather than being translated from one call.
  - ⚠️ Rows are now species × locales, which took a full run to ~20 hours. Solved by batching in
    **T-182** (~50× fewer requests); a full Swedish build now fits inside the job cap.
- **T-183 · The content loader must read each row's own locale** — *Claude · S · `DONE` · deps: T-181*
  - `build_content_rows` stamped every row with a single caller-supplied `locale`, from when all
    generated content was English. With per-locale items (T-181) that would have collapsed all 18
    languages onto the same `(species_id, locale)` dedupe key and kept whichever arrived first —
    **seventeen languages of work discarded by a load that reports success.**
  - Each item's own `locale` now wins; the argument survives only as the fallback for
    `content_*.json` payloads written before the field existed, which must still load as English.
  - 4 tests, including that a genuine duplicate *within* one locale is still skipped — the dedupe
    is still doing its job, it is just keyed correctly now.
- **T-182 · Batch the Wikipedia extract fetches** — *Claude · M · `DONE` · deps: T-181*
  - T-181 multiplied the build by the locale count: ~6,824 species × 18 locales ≈ **123k requests**,
    roughly **20 hours** at the client's polite pacing, against a 6-hour Actions cap. A single run
    could not finish and would be killed mid-taxon.
  - Fixed by **reducing** the work, not redistributing it: MediaWiki accepts **50 titles per
    query**, so the same build is ~2,500 requests — ~50× fewer, inside the cap, and far politer to
    Wikipedia than 123k individual hits. `build_localized` makes one batched pass per locale.
  - **Mapping the response back is what silently goes wrong.** MediaWiki keys pages by page id and
    reports normalisation and redirects in *separate arrays*, so a lookup by requested title loses
    every species whose article sits behind a synonym — and taxonomy is full of synonyms
    (`Parus caeruleus` → `Cyanistes caeruleus`). `map_extracts` follows both hops and chains them in
    the order the API applies them. 10 tests.
  - Every requested name appears in the result, mapping to None when there is no article, so the
    caller can distinguish "no article" from "never asked".
  - A failed batch costs that locale's facts, not the run. The **request count is pinned by a
    test**, because a regression to per-species fetching would pass every other test here while
    quietly restoring the 20 hours.
- **T-184 · GBIF species must adopt the curated id that already owns their key** — *Claude · M · `DONE` · deps: T-167*
  - The Norway run (32116983847) ingested for **1h48m**, then the load died in 4 seconds:
    `duplicate key value violates unique constraint "species_gbif_key_idx"` on
    `gbif_key=9705453`. **The whole transaction rolled back, so nothing persisted — not Norway, and
    not Sweden's 78,530 committed rows either.**
  - Cause: the curated 54 and the GBIF catalogue are **the same species arriving by two routes**.
    `great-tit` already holds gbif_key 9705453, and `species.gbif_key` is uniquely indexed
    (20260707000003), so inserting `gbif:9705453` for *Parus major* is a second row for one animal.
    `on conflict (id)` never fires because the ids differ. This would have hit most of the 54 —
    they are common Swedish species and GBIF has them all.
  - `adopt_existing_ids` resolves gbif_key → existing id before writing and rewrites the presence
    rows to follow. **The curated id wins**: 38 locales of hand-written content and the Storage
    photos are keyed to it, while the GBIF row only carries taxonomy and presence, which the upsert
    merges onto the existing row. 5 tests.
  - The unique index is *correct* and stays — one species, one GBIF key. The bug was the loader
    minting a second identity for a species that already had one.
  - ✅ Unrelated but confirmed by the same run: the photo upload succeeded again (54/54,
    `bucket already exists`), so T-119/T-168 are genuinely idempotent.
  - ✅ **Verified in production** (run 32129456489, ingest skipped, load only):
    `adopted 53 curated ids` / `loaded 21 regions, 11936 species, 78530 presence rows`. **Sweden is
    in the database** — the first successful load this project has had.
  - 🔎 **53, not 54, is the right number** and corroborates T-163 independently: `common-dandelion`
    is the one curated species with no GBIF presence row, because GBIF splits *Taraxacum officinale*
    into microspecies. The adoption count agreeing with a gap found months earlier is good evidence
    the mapping is doing what it claims.
  - ⏳ The Norway ingest itself also failed after 1h48m; cause not diagnosed — the error is ~1h48m
    back in a log the API's tail cannot reach. The artifact (9320514029) held **19 files against
    Sweden's 12 committed**, so **7 of 9 Norwegian taxa succeeded** and 2 failed. Norway is v2 under
    T-177, so this is not a v1 blocker.
- **T-185 · Document running on a phone over USB** — *Claude · S · `DONE` · deps: T-175*
  - T-175 documented the Expo Go path, which needs the phone and PC on one network with Node
    reachable — and the Director's firewall blocks exactly that. A QR code is not a usable
    instruction if it cannot connect.
  - Documents `adb reverse tcp:8081 tcp:8081` as the key move: it maps the *phone's* localhost:8081
    to the *PC's*, so Metro is reached down the cable and the network is not involved at all. No
    SSID matching, no firewall exception, no tunnel latency.
  - Two options, because they cost very differently: **Expo Go over USB** needs only platform-tools
    (~10 MB), while **`npx expo run:android`** needs Android Studio and JDK 17 (~4 GB) but produces
    a real dev build that exercises `expo-dev-client`, notifications and location as the store build
    will. `android/` is already gitignored, so prebuild does not pollute the repo.
  - Notes that `adb reverse` does not survive an unplug — a stale mapping is the usual cause of
    "Metro is not running" when everything else looks correct.
  - iOS from Windows is stated as impossible rather than left to be discovered: it needs Xcode.
- **T-186 · Per-user send slot — one cron cycle must not notify everyone at once** — *Claude · M · `DONE` · deps: T-063, T-131*
  - `canSendNow` only asked whether the hour was outside quiet hours, so **there was no jitter at
    all**: a cron firing at 09:00 would have notified every user in Sweden in the same instant.
    That is a load spike, and worse for this product it is a *predictable* one — a daily
    notification that always lands at 09:00 is a schedule, not the small surprise the app is for.
  - `lib/sendSlot.ts` derives each user's hour **from their user id**, not from an RNG. A random
    slot would move every cycle, so no test could pin it and a user's timing would wander day to
    day; a hashed one is stable per user, spreads the population uniformly across the 13 waking
    hours, and keeps the engine clock-free and deterministic. 11 + 5 tests.
  - **FNV-1a rather than a character sum.** Supabase user ids are UUIDs that differ only in their
    later characters, and an additive hash buckets those together — which would quietly undo the
    spreading the whole task exists for. Pinned by a test using ids sharing a 35-character prefix.
  - **At-or-after the slot, not exactly at it.** A cycle that is missed, delayed or fails
    self-heals later the same day instead of costing the user their notification; `maxPerDay` still
    holds it to one. Ordering is by position in the window, not clock number, so a window wrapping
    past midnight (22→02) correctly places hour 0 after hour 23.
  - `userId` is **optional** on `DueUser`: without it the user is eligible in any waking hour,
    which is the pre-T-186 behaviour and keeps the engine usable where no id exists.
  - The check lives in the engine rather than in `canSendNow`, because `sendSlot.ts` imports
    `isQuietHour` from `cadence.ts` and checking it there would make the two circular. `before-slot`
    is still declared in `BlockReason` — it is a cadence block like the others.
  - 📌 **Context: no notification is sent today at all.** `cron.job` is empty and the T-064 Edge
    Function does not exist; only `delete-account` is deployed. Doing this now means T-064 is built
    against a spread population from the start, rather than retrofitted after a launch-day spike.
- **T-187 · Vernacular names: stop showing the binomial as a common name** — *Claude · M · `DONE` (ingest is T-188) · deps: T-184*
  - `db_rows.py` set `common_name = scientific_name`, so all 11,936 loaded species render
    **"*Lutra lutra*" as though that were what people call an otter**. The card title is the most
    visible string in the app, and this is the last big gap in v1.
  - ✅ **`common_name` is now null when unknown**, never a copy of the binomial. A null is honest
    and lets the UI render the scientific name *as* a scientific name (italic, secondary); a copy is
    a quiet lie in the one string every user reads first.
  - ✅ `gbif/vernacular.py` + `GbifClient.vernacular_names()`. GBIF's
    `/species/{key}/vernacularNames` returns **every language in one call**, so this is 6,824 calls
    for all 18 locales rather than 18 passes. Accepts ISO 639-3 and 639-1 (GBIF uses both), prefers
    a `preferred`-flagged name, and **drops anything unmapped rather than guessing** — a name shown
    to the wrong reader is worse than no name. 10 tests.
  - ⚠️ **Coverage will be very uneven, by nature of the source.** Swedish is excellent (Dyntaxa
    feeds GBIF); the immigrant-language roster is near-empty for most species. That is not a
    failure: the card falls back to the scientific name, which is what a field guide in those
    languages prints anyway. Do **not** machine-translate species names to fill the gap — a
    fabricated vernacular name is exactly the failure T-159 refused for Irish and Maltese.
  - ✅ The ingest that uses this is **T-188**.
- **T-188 · Vernacular-name ingest, end to end** — *Claude · M · `DONE` · deps: T-187*
  - `build_vernacular.py` walks the **6,824 noise-filtered species** (the v1 catalogue per T-177),
    calls GBIF once per species, and writes `data/vernacular.json`. One call returns every language,
    so a single pass covers all 18 locales.
  - **Resumable by design.** ~6,824 polite calls is roughly 40 minutes; a failure at species 6,000
    must not discard the first 5,999. Results are written every 100 species and a re-run skips what
    is already recorded — *including* species recorded as having no name, because "GBIF holds
    nothing here" is an answer, not a gap to retry forever. One failing species is logged and
    skipped rather than ending the run.
  - **Coverage is reported per locale, and empty locales are printed as `0.0%` rather than
    omitted.** An absent line reads as "not checked"; an explicit zero reads as "checked, and there
    is nothing" — which for most of the immigrant roster is the true answer. Assumed coverage is
    how a gap becomes a surprise at launch.
  - Threaded end to end: `build_content.py` reads the file and fills each row's `commonName` for its
    own locale; `content_rows.py` carries it into `species_content.common_name`, normalising blank
    to NULL (an empty string renders as a blank card title, which is worse than the binomial).
    Absent vernacular data is not an error — every card still renders.
  - `Data pipeline` gained a **`vernacular`** input, ordered before content generation since the
    content step consumes its output.
  - 14 new tests (8 ingest + 3 content + 3 loader), all network-free.
- **T-189 · Milestone: the database is now the complete content source** — *Director + Claude · — · `DONE` · deps: T-176, T-184*
  - Director ran `Database migrate` twice on 2026-08-18 — `repair` for the six migrations already
    live under MCP-stamped versions, then `apply` for `20260810000001`. `species_content` went from
    **162 → 2052 rows** (38 locales × 54 species).
  - Combined with T-184's load (21 regions / 11,936 species / 78,530 presence rows), **every source
    the app needs is now in Postgres**: taxonomy, presence, content in all 38 locales, and 54 photos
    in Storage.
  - **This clears the T-057 seed gate.** The bundled `HardcodedSpeciesRepository` is no longer the
    more complete source, so injecting `SupabaseSpeciesRepository` no longer risks blanking the
    dual-language secondary half. That swap is the next app-side task.
  - Worth recording how long this took to become true: the load had **never once succeeded** before
    today. It was blocked in turn by a signature mismatch (T-173), an IPv6-only connection string
    (T-174), a curated/GBIF id collision (T-184), and a migration history whose stamps did not match
    its filenames (T-176). Each looked like the last one until it was fixed.
- **T-190 · The mammal habitat hint told readers to look for otters in meadows** — *Claude · S · `DONE` · deps: T-180*
  - The mammals pilot rendered *Lutra lutra* as "Active in your region year-round. Look for it **in
    woodland edges, meadows, and quiet cover**." That is not dull, it is **false** — and false in
    the one field the app can least afford it (invariant #1). Otter, beaver, water vole and seals
    all get the same line.
  - Cause is structural, not a typo: habitat hints are **per taxon**, shared by every species in it,
    so any hint naming only one kind of place is wrong for the members that live somewhere else.
    `mollusc` already had the right shape — "in damp, shady places and clean fresh water" — naming
    both rather than picking one.
  - Fixed by widening the mammal hint to include water, **in all 18 locales**. Regression test
    anchored in English, where the bug was found; the other 17 were widened by hand in the same
    commit and are covered by the differs-from-English conformance check.
  - 📌 **This is a mitigation, not the real fix.** The honest solution is *per-species* habitat, and
    GBIF already publishes it: `/species/{key}/speciesProfiles` returns `marine`, `freshwater` and
    `terrestrial` flags. That would let an otter get a water hint and a badger a woodland one from
    real data instead of a taxon average — filed as **T-191**.
- **T-191 · Per-species habitat from GBIF species profiles** — *Claude · M · `DONE` · deps: T-188, T-190*
  - T-190 stopped the mammal hint being *false*, but a hint naming every habitat a taxon might
    occupy is vague by construction — it is the average of a badger and a seal. GBIF publishes the
    real answer per species: `/species/{key}/speciesProfiles` carries `marine`, `freshwater` and
    `terrestrial` flags.
  - **Profiles are OR-ed, not voted on.** They come from several checklist datasets that disagree,
    and the costs are asymmetric: a false "aquatic" is a slightly odd hint, a false "terrestrial" is
    telling someone to look for an otter in a meadow — the exact bug this exists to fix.
  - Water wins when a species is both. An otter *is* terrestrial too, but the water hint is the one
    that sends a reader to the right place. **Absent profile data is never aquatic** — it falls back
    to the taxon hint rather than asserting a habitat nobody published.
  - One `habitat_aquatic` string per **locale**, not per taxon: an otter, a dragonfly and a water
    beetle all want the same sentence. 18 written, with the same conformance checks as the rest
    (non-empty, differs from English, no doubled words in the composed sentence).
  - Rides along in the T-188 pass rather than adding a second ingest — that loop already walks every
    shipped species and is already resumable, so this is a second call inside it.
  - 🐛 **Caught while wiring it: a resumable job whose record shape changed under it.** Entries
    written by the pre-T-191 version have names but no `_realms`, and `pending_keys` would have
    treated them as done — leaving every species fetched earlier permanently without habitat data,
    *invisibly*, because the file looks complete. `pending_keys` now keys on `_realms` rather than
    mere presence. Two older tests encoded the previous contract and were updated rather than
    deleted, since their intent (resume works; an empty answer is still an answer) still holds.
- **T-172 · Presence refresh: annual, 5 February, fully unattended** — *Director + Claude · S · `DONE` · deps: T-167*
  - 🔭 **Director decision (2026-08-18):** annual, and **no manual step** — "I might not be available
    every February." This overrides the manual-load gate originally proposed; a pipeline that needs
    someone present is a pipeline that stops the first year nobody is.
  - **Annual is the right cadence for a reason, not a compromise.** `build_presence.py` passes no
    year filter, so every run aggregates GBIF's entire historical record — decades. One more year
    adds a few percent to a huge base and will essentially never move a common species' month
    window. What *does* change on a yearly scale: range shifts (species crossing the occurrence
    threshold), GBIF backbone revisions (splits, lumps, re-keying), and retroactive bulk dataset
    publications. February catches all three, after the backbone release and year-end publications.
  - `cron: "0 3 5 2 *"`. Scheduled runs carry no inputs, so the ingest defaults to `SWE` and the
    vernacular pass is enabled by `github.event_name == 'schedule'`; the input is passed through the
    environment rather than interpolated into the shell.
  - ⚖️ **What replaces the human is T-192, not nothing.** Removing the gate removes the person who
    would have noticed a broken ingest before it overwrote good data — so the loader now refuses a
    load carrying far less data than the database already holds. Unattended does not mean unchecked.
- **T-193 · Wire the content loader into the pipeline** — *Claude · S · `DONE` · deps: T-181, T-188*
  - `gbif/supabase_load_content.py` existed since T-145 and was **in no workflow at all** — the same
    gap `build_presence.py` had (T-167) and the reason generated content could never reach the
    database however well it was generated. A script nobody runs is indistinguishable from one that
    does not exist.
  - Added after the species load, deliberately: `species_content.species_id` references
    `public.species`, so its rows have nothing to point at until that has landed.
  - **An empty content set is a no-op, not a failure.** It means `build_content.py` did not run this
    cycle (`content_scope: skip`, which is the common case), and failing there would redden a
    pipeline whose real work succeeded. A *failed* load still raises — the distinction is between
    "nothing to load" and "loading went wrong", which the unattended schedule (T-172) makes worth
    being precise about.
- **T-195 · Cover the supabase-js collection adapter** — *Claude · S · `DONE` · deps: T-165*
  - `supabaseCollectionStore.ts` sat at **56.6% statements / 28.6% branches** — the worst-covered
    file with real logic, and the one holding the user's catches. Now **93.3% / 100%**. Global
    coverage moved 90.58 → 91.02 statements and 83.13 → 84 branches, restoring headroom above the
    thresholds (90/80/85/90) that had shrunk to half a point.
  - **The branches that were missing are the ones that matter.** Every supabase-js call returns
    `{ data, error }` rather than rejecting, so a swallowed `error` looks exactly like an empty
    collection — the user's catches silently gone with nothing having failed. Worse since T-165: the
    offline store reads a throw as "stay queued, retry", so returning empty instead would make it
    drop the outbox believing it had been delivered. Both error paths are now pinned.
  - Also pins the column list and the `onConflict: 'user_id,species_id'` upsert key: a column
    dropped from the select becomes a silently-null field on every record, and a wrong conflict key
    duplicates rows instead of updating them.
  - ⚠️ **Attempted first and reverted: four more `useCollection` tests.** They pass individually and
    fail in-suite — the same order-sensitivity that already cost this file two tests. Its
    fire-and-forget writes are still resolving when the next test's `AsyncStorage.clear()` runs.
    Recorded so the next person does not spend the same hour: the logic underneath is covered by
    `offlineCollectionStore.test.ts` (13 tests), and the untested part is the thin React adapter.
    Making it testable means extracting the effect bodies, not adding more tests to that file.
- **T-196 · `species.common_name` must be nullable — and rows must match the schema** — *Claude · M · `DONE` · deps: T-187*
  - **A bug I introduced.** T-187 stopped `common_name` copying the binomial and sent NULL instead —
    right reasoning, tested — but `species.common_name` is `not null`, and the unit test asserted
    the *value* without knowing the *constraint*. The load then failed in production after a
    52-minute run: `NotNullViolation … Failing row contains (gbif:2426805, Rana temporaria, null…)`.
  - Fixed the way T-187 intended rather than by reinstating the lie:
    `20260818000001_species_common_name_nullable.sql` drops the constraint. The column was
    `not null` from when the only species were the curated 54, every one with a hand-written name;
    most of GBIF's 11,936 have no common name in any language. Same shape as `species_content.fact`
    (T-146) and nullable for the same reason — absent is a real state, and encoding it as a
    plausible-looking value is worse than encoding it as nothing.
  - 🛡️ **The real fix is the test that would have caught it.** A unit test on a row builder cannot
    see a database constraint, and no live DB is available here — but **the schema is in the repo**.
    `test_schema_nullability.py` parses the migrations for `not null` (and `primary key`, which
    implies it in Postgres), honours later `drop not null`, and asserts the loader never sends None
    for a required column. It reproduced the production failure exactly before the fix.
  - App side: `SpeciesRow.common_name` is now `string | null` and the mapper falls back to the
    scientific name, so a card always has a title. That fallback is honest **at the display layer** —
    it is the name we actually have — while the row still records that no common name is known,
    which is what T-187 was protecting. Blank strings are treated as absent.
- **T-197 · Move the consent age gate out of a component closure** — *Claude · S · `DONE` · deps: T-089*
  - "Minors can never enable analytics" (T-089, the minimal-data path) lived as two lines inside an
    untested handler in `App.tsx`. A **safety rule that exists only inside a component closure is
    one refactor away from disappearing without a single test going red** — and `App.tsx` sits at
    56% function coverage, so nothing was watching it.
  - `applyConsentChange(state, kind, value, analyticsLocked)` in `lib/consent.ts`, 6 tests.
  - **The lock is one-way, and that is the point.** A minor can always turn analytics *off*;
    blocking the toggle in both directions would trap someone with analytics on, which is the
    opposite of what a minimal-data path is for. Only analytics is age-gated — location and
    notifications are functional consents the app asks for openly.
  - Returns the **same object** when it refuses, so a blocked change costs no write to the consent
    store. `App.tsx` checks identity and returns early.
- **T-198 · `vernacular.json` does not survive between runs** — *Claude · S · `DONE` · deps: T-188*
  - `build_vernacular.py` is resumable **within** a run — it writes every 100 species and skips what
    is recorded — but the file lives only in the run artifact. A fresh run checks out a clean repo,
    finds nothing recorded, and re-fetches all 6,824 species (~52 min, doubled by T-191's profile
    call).
  - Not urgent, and deliberately not fixed by committing the file: the **database is the durable
    store**. Once `build_content.py` has consumed the names and the content loader has written
    `species_content.common_name`, the JSON is a cache. The chain only has to complete once per
    refresh, and the refresh is annual.
  - If it does become worth fixing, downloading the previous run's artifact at job start is the
    right shape — resumability across runs, without committing a derived 2 MB file.
  - **Done (2026-10-28):** `pipeline/restore_vernacular.py` runs before the fetch in
    `data-pipeline.yml` (job permission `actions: read`). It takes the newest unexpired
    `pipeline-data` artifact from another run and restores only its top-level `vernacular.json`,
    after a shape check. It never extracts archive paths to disk, and it never fails the job:
    without a usable artifact it falls back to a full fetch.
    - **Age cap: 30 days.** Resuming is for retries. A year-old file would make the February
      refresh skip every species and ship last year's names.
    - Known limit: each run re-uploads what it restored, so runs repeated more often than every
      30 days would keep carrying names forward instead of refreshing them. The schedule is
      annual, so this does not arise today.
    - It also runs for content-only re-runs, which then get names without a fetch.
    - Tested in `pipeline/tests/test_restore_vernacular.py`, including the step order in the
      workflow.
- **T-199 · Audit: do the four "critical rules" actually have tests?** — *Claude · S · `DONE` · deps: —*
  - CLAUDE.md names four rules that must get explicit tests: free-catch enforcement (T-075),
    catch-spot safety exclusions (T-049), NC-license filtering (T-042), honest copy (T-066).
    **None of them cited a task id in any test file**, so the claim was unverifiable by search —
    which is how a governance rule quietly stops being true. Audited each by behaviour instead.
  - ✅ **Honest copy** — well covered: `lib/contentHonesty.test.ts`, `shareSpecies.test.ts`,
    `pipeline/tests/test_content.py`, plus the honesty-phrase checks in every locale (T-153).
  - ✅ **Media licence filtering** — covered in `pipeline/tests/test_media.py`.
  - 🐛 **Occurrence licence filtering had NO test** — fixed here (`test_licence_filter.py`, 6 tests).
    The rule lives in exactly one place, the `license` params on `/occurrence/search`, and it is
    what makes commercial use lawful at all (DATA-SOURCING-LICENSING §1). The asymmetry with media
    is the dangerous part: a dropped *media* check shows up as a missing photo, while a dropped
    *occurrence* check shows up as nothing — NC records look identical to CC-BY ones once counted.
    Silent, legal, and discoverable only by reading the code.
  - ⚠️ **Free-catch enforcement is client-side only** — see T-200.
  - ℹ️ **Catch-spot safety (T-049) is not built at all** (no `catchSpot`/`hazard` anywhere). That is
    unbuilt scope rather than an untested rule, and it is E4 — but it should not be listed among
    rules that "get explicit tests" as though it were shipping.
- **T-200 · Free-catch enforcement is client-side only** — *Claude · M · `DONE` (applied + verified live 2026-10-28) · deps: T-075*
  - `profiles.free_catches_used` / `free_catch_season` exist, but **nothing on the server enforces
    them**: no RLS policy, no trigger, no Edge Function. All the logic is in `lib/freeCatch.ts`,
    which is well tested — and which runs on the user's device.
  - CLAUDE.md states this rule is enforced server-side. It is not. That is a gap between a stated
    invariant and reality, which is worth more than the paywall itself: the whole point of writing
    invariants down is that they can be relied on.
  - Practically: the 3-catches-per-season limit is bypassable by anyone willing to edit local state,
    so **Full Game revenue rests on client-side honesty**. Not urgent before launch, but it should
    be a deliberate decision rather than an accident — either enforce it in a trigger/Edge Function,
    or amend the invariant to say client-side and accept the leakage.
  - **Decision: enforce** — CLAUDE.md states it as a server-side invariant; the code now matches it.
    Worse than described above: the app's counter was plain component state, so **every restart
    reset it to 3** — the limit did not even hold on the device.
  - ✅ **Database** (migration 20261029000001): trigger `collection_enforce_free_catch` on the only
    door catches come through (`collection`, written under RLS by the offline outbox). A *new* catch
    — a row becoming caught, or a species from an earlier season caught again — locks the profile row
    `FOR UPDATE` (no double-spend from parallel syncs) and counts against the season; the 4th raises
    `free_catch_limit`. Re-saving an unchanged row is free (PostgREST upserts resend every column).
    The season comes from the **server clock** in Stockholm time (`public.season_key`, identical to
    `seasonKeyOf`), never the client's `caught_at`, so backdating cannot spend an old allowance.
    `profiles.full_game` added (server-only). **Column grants**: users may write only `user_id` /
    `home_region` on profiles — RLS limited the row, not the columns, so the counter and entitlement
    were client-writable.
  - ✅ **App**: the count is derived from the persisted collection (`freeCatchStateFrom`), so a
    restart cannot reset it. A refusal is a typed `CatchRefusedError`; the outbox drops that write,
    un-catches the species locally (it stays Spotted) and keeps delivering what was queued behind it
    — an ordinary failure is still retried. `test_free_catch_limit.py` pins the SQL limit to
    `FREE_CATCHES_PER_SEASON` and checks no user grant reaches the counter or the entitlement.
  - ✅ **Applied and verified live** (db-migrate run 9 = apply; run 11 = verify). `pipeline/db/verify.py`
    runs the rule as a throwaway `authenticated` user in one always-rolled-back transaction: catches
    1–3 ok, the 4th → `free_catch_limit`; pledging help on a caught species free; self-granting
    `full_game` and resetting the counter → `permission denied`; the app's `home_region` upsert ok;
    season boundaries in Stockholm time. All 12 hold. Re-run any time with **db-migrate mode=verify**
    — it writes nothing and, being CI, needs nobody to approve a database write.
- **T-201 · Push notifications: the whole chain is missing, not just the sender** — *Claude + Director · L · `DONE` (server live + verified 2026-10-28; on-device check is T-205) · deps: T-063*
  - The app's premise is a passive notification, and **nothing sent one**: `expo-notifications`
    asked for permission and threw the answer away; no token, no table, no Edge Function, empty
    `cron.job`. Four layers were missing; all four now exist.
  - **Director decision: FCM HTTP v1 directly, not Expo's push service** — one fewer account and
    service in the chain. The device registers its raw FCM token (`getDevicePushTokenAsync`), so
    **only Android is deliverable**; iOS would need the Firebase iOS SDK (out of v1 scope).
  - ✅ **Storage** (`20261028000001_push_notifications.sql`): `push_devices` (PK `user_id, token`;
    owner-only RLS for all four verbs) and `notification_log` (owner may read; only the service role
    writes). Both cascade on account deletion. **A device row *is* the opt-in** — the app deletes
    the user's rows when notification consent is withdrawn, so there is no second flag to drift.
  - ✅ **App** — `lib/pushRegistration.ts` (`syncPushRegistration` + `SupabasePushGateway`),
    `lib/permissions.ts` (`getDevicePushToken` creates the `nearby` Android channel first;
    `onPushTokenChange`), `components/usePushRegistration.ts` (runs are *chained* so a withdraw can
    never land before an in-flight register). App gates it on stored consent having loaded — acting
    on the all-off default would withdraw a consenting user on every launch. Onboarding now reports
    `notificationOutcome`; "Turn on nudges" + OS grant records notification consent.
  - ✅ **Sender** — `supabase/functions/send-notifications` is I/O only; who-gets-what is
    `lib/pushDispatch.ts` (`planSends`: Stockholm wall clock via Intl so DST is right, daily cap on
    the *local* day, a token shared by two accounts goes to the newest registration only, iOS
    dropped) and `lib/fcmAuth.ts` (RS256 JWT → OAuth token with WebCrypto, no Google SDK). Dead-token
    detection deletes rows only on `UNREGISTERED`/404/"registration token" — never on a generic 400,
    which could be *our* malformed payload and would unsubscribe everyone.
  - ✅ **One engine, two runtimes** — Deno needs `.js` specifiers, the app uses extensionless ones.
    `scripts/edgeShared.js` transpiles exactly the modules the function imports (TypeScript's own
    `transpileModule`, no bundler added) into `supabase/functions/_shared/lib`; a test fails if the
    committed copy drifts from the source. *Rejected:* duplicating the engine in Deno (two copies of
    the cadence rules would diverge); Deno sloppy-imports (unsupported by the deploy bundler).
  - ✅ **Schedule + auth** — pg_cron `send-notifications` at `7 * * * *` (hourly because T-186 spreads
    users over the waking hours; minute 7 to stay off the top-of-hour rush) posts via `pg_net`. The
    function runs with `verify_jwt` off (cron has no user JWT) and instead requires `x-cron-secret`,
    generated inside the migration into **Vault** and checked by a service-role-only SQL function —
    nobody ever handles the secret.
  - ✅ **Copy** — `push.title` "{name} is active in your region" / `push.body` "This is its season where
    you live." (en + sv; other UI locales fall back to English). Seasonal, never real-time — the
    catalog honesty test covers it. **Photo attached** when the species has one (the 54 of T-202).
  - ✅ **Verified live 2026-10-28**: function deployed (12 files, byte-identical to the repo); wrong
    secret → 403; dry run → 200; smoke run with a deliberately fake token → planned an in-season
    Kronoberg species, Google accepted the `FCM_SERVICE_ACCOUNT` key, FCM rejected the token as
    invalid, and the row was deleted (`deadTokens: 1`).
  - Body options for manual runs: `{"dryRun":true}`; `{"testUserId":"<uuid>"}` sends to that user
    now, ignoring slot and daily cap, and is not logged (it must not eat the real notification).
  - ⚠️ **Every user's region is Kronoberg** (`KRONOBERG_REGION`, now keyed by its GADM id `SWE.9_1`
    so the server can read it). Real per-county hometown resolution is **T-090** — until it lands, a
    user in Skåne is notified about Kronoberg's species.
  - ⚠️ Tapping a notification opens the app but **not yet the species card** — the id rides in
    `data.speciesId`; the deep link is **T-031**.
- **T-202 · Photos exist for 54 of 6,824 species** — *Claude · L · `DONE` (whole catalogue sourced + verified live 2026-10-29) · deps: T-119, T-177*
  - `build_kronoberg_media.py` sources photos for the curated 54 only, and `SpeciesHero` reads that
    bundled manifest. Every other species renders its category glyph.
  - The pipeline already knows how to do this — `wikimedia.py` fetches a licence-clear lead image
    at 400 px for any scientific name — so this is a scale change, not new capability: run it over
    the catalogue, upload to the `species-media` bucket, and read media from the database rather
    than a bundled module.
  - Cost check before running: 6,824 images at ~40–160 KB is roughly **0.4 GB** in Storage, against
    Supabase's 1 GB free tier. That is close enough to matter, so measure before uploading — and it
    may argue for hotlinking thumbnails or a smaller width for the long tail.
  - ✅ **`public.species_media`** (migration 20261029000002): one row per species — Storage URL of a
    ~400 px thumbnail + author + licence (CC0 / CC-BY / CC-BY-SA only) + Commons source page. A row
    with `url` null records "looked, no commercial-safe photo" so it is not re-queried every run.
  - ✅ **`pipeline/build_species_photos.py`** + **`species-photos.yml`**: Wikipedia lead image →
    licence check (`media/licenses.app_license`, shared with the curated job) → paced download
    with 429 backoff → Storage `species-media/<id>.jpg` → row. **Most-observed species first**, a
    time budget per run, commits every 25 — resumable across runs; weekly schedule until done,
    then it only picks up species a catalogue refresh adds. The curated 54 are seeded from their
    manifest first and never overwritten (their photos were hand-checked).
  - Budget: ~6,800 × ~40 KB ≈ 270 MB of the 1 GB free Storage tier.
  - ✅ **Verified** (run 40773817420, green, 3h08m, one run — no resume needed):
    - `species_media` records **all 6,824** catalogue species: **4,797 with a photo (70%)**, 2,027
      recorded as having no commercial-safe photo. Those keep the category glyph and are not
      re-queried weekly.
    - Licences: CC-BY-SA 3,199 · CC-BY 1,029 · CC0 569. Nothing else ships (invariant #8).
    - Storage measured: **4,797 objects, 330 MB** of the 1 GB free tier (invariant #7 holds).
    - The app sees them: Kronoberg's `region_catalogue` has a photo for 2,362 of 3,020 species
      (78%), and for **all of the 50 most-observed**. The misses sit in the long tail, as expected
      from most-observed-first ordering and Wikipedia's coverage.
- **T-215 · The app and the notifications use the catalogue photos** — *Claude · M · `DONE` (code + migration; photos appear as T-202's runs fill the table) · deps: T-202*
  - `SpeciesHero` and the notification image still read only the bundled 54. Read `species_media`
    (via `region_catalogue` / `describeSpecies` for the app, a join in `send-notifications` for the
    image) once T-202's runs have filled it.
  - ✅ `Species.photo` + `photoFor(species)`: the bundled hand-checked photo for the curated 54,
    else the database's, else null → glyph. `SpeciesHero` uses it, attribution included.
  - ✅ `region_catalogue` returns the photo columns (migration 20261029000003; drop + recreate,
    since a function's result columns cannot be altered in place) and `describeSpecies` fetches
    `species_media` for its ids — every card gets its photo in the same call, not one per card.
    `mediaRowToPhoto` never ships a recorded miss or a licence outside CC0/CC-BY/CC-BY-SA.
  - ✅ `send-notifications` attaches the catalogue photo to the push (bundled first), so the lock
    screen shows the animal for every species with a photo, not only the 54.
- **T-205 · First real push on a real phone** — *Director · S · `DONE` (2026-10-28) · deps: T-201*
  - Everything server-side is verified; what no test can show is the notification on a lock screen.
  - Steps: `google-services.json` in the repo root (never committed) → `npx expo run:android` with
    the phone on USB → go through onboarding and tap **Turn on nudges** → allow notifications. Then
    tell Claude, who triggers a `testUserId` run for your account and confirms the row.
  - Pass = a notification titled "<species> är aktiv i din region" (or English) arrives, with a photo
    when the species is one of the 54.
  - ✅ **Passed 2026-10-28 on a Samsung (Android), dev build.** "Erica tetralix is active in your
    region" arrived in the shade with the app in the background; tapping it opened the species card
    (T-031 verified on device). First attempt failed silently with the app *open* on a build from
    before T-031 — the foreground handler is what fixed that.
  - Found by the test: (1) the title used the **binomial** — the database has no common name for
    this species (T-210); (2) it came in **English** although the user had chosen Swedish, because
    the language override is not persisted and a reload reverted it (T-211). No photo: not one of
    the 54 (T-202).
- **T-206 · Deploy Edge Functions from CI** — *Claude + Director · S · `DONE` · deps: T-201*
  - T-201 was deployed through the Supabase connector. A change to the engine now needs a manual
    redeploy, or the server quietly runs old rules. A workflow running `supabase functions deploy` on
    push to `main` (when `supabase/functions/**` changes) closes that gap.
  - **Director:** create a Supabase personal access token (Account → Access Tokens) and save it as the
    GitHub repo secret `SUPABASE_ACCESS_TOKEN`. ✅ done 2026-10-28.
  - ✅ `.github/workflows/deploy-functions.yml`: on push to `main` touching `supabase/functions/**`
    (or by hand), regenerates the shared engine copy and fails if it differs from the commit, then
    `supabase functions deploy send-notifications --no-verify-jwt --use-api`. `delete-account` is
    left out on purpose — deploying it is T-093's decision, not a side effect of this workflow.
- **T-207 · This Week still shows the bundled Kronoberg list** — *Claude · M · `DONE` · deps: T-090, T-078*
  - Found while building T-090: `ThisWeekScreen` renders `KRONOBERG_SPECIES` with the subtitle
    hard-wired to "Kronoberg", and onboarding's first Spotted card picks from the same 54. T-078's
    `thisWeekFromPresence` (live `species_presence`) is built and tested but never wired in.
  - So a user in Skåne now gets Skåne notifications (T-201 + T-090) but a Kronoberg This Week.
    Wire the screen to `regionPresence(hometown.id)` + the catalogue, with the county name in the
    subtitle, keeping the bundled list as the offline / preview fallback.
  - ✅ `components/useThisWeek.ts` + `lib/thisWeekLive.ts`: presence loads once per county; only the
    top `THIS_WEEK_SHOWN` (50) rows are described (name in the UI locale → English → binomial, plus
    "when & how"); the subtitle counts every active species. No hometown → bundled preview list.
  - ✅ New `SpeciesRepository.describeSpecies(ids, locale)` (bundled, Supabase and fallback impls).
  - 🐞 **Fixed: PostgREST's silent 1,000-row cap.** `fetchPresence` made one request, and a county
    has ~3,700 presence rows — most were dropped with no error. Every list read now pages (ordered,
    so pages are stable) and `in.(…)` filters go in chunks of 150.
  - 🐞 **Fixed: species with no curated category crashed "Find it nearby".** GBIF amphibians,
    reptiles, arachnids and molluscs have `category = null`; the minigame dispatcher had no game for
    them. `minigameCategory` maps by how the animal moves (frog/lizard → stealth, spider → trace,
    snail → spot & frame).
  - 🔁 **Ordering changed: most-observed first** (was rarer first, T-078). Over a real county the
    rarer-first list opened with species recorded once or twice — mostly nameless and the least
    findable. Observation count is the honest findability proxy; the notification engine's weighted
    sampling still gives the long tail its turn.
  - ⚠️ Onboarding's first Spotted card still picks from the bundled 54 — kept deliberately: they are
    widespread across Sweden and carry hand-written Tier-1 content.
- **T-208 · Almanac reads only the first 1,000 of 11,937 species** — *Claude · M · `DONE` · deps: T-207*
  - `fetchSpecies` is the one list read T-207 did not page: the Almanac gets an arbitrary 1,000
    species. Paging it naively means ~12k rows on every launch. Better: the Almanac shows the user's
    county (presence ids, like This Week) plus everything they have collected, described on demand.
  - Also: a card opened for a database species titles itself with `commonNameFor`, which only knows
    the bundled 54 — other species show the English/binomial name instead of the localized one
    `species_content.common_name` already holds.
  - ✅ **`public.region_catalogue(region, loc)`** (migration 20261028000002): presence + species +
    names in the locale (→ English → null) joined server-side, ordered (occurrences desc, id) — a
    total order, so the app pages it safely past the 1,000-row cap. ~70 ms for Kronoberg's 3,020.
    SECURITY INVOKER over public-read tables.
  - ✅ The Almanac lists **the user's county** plus every collected species the county list lacks
    (`lib/almanacCatalogue.ts`; the onboarding starter, or one dropped by a refresh) — a collection
    never holds species the Almanac cannot show. Preview mode lists the bundled set with no network
    read. `components/useAlmanacCatalogue.ts` reads the county once per county + language; a new
    catch only looks up the few extras. A failed read shows an empty Almanac, not a spinner.
  - ✅ **Card titles localize for database species**: `Species.names` carries the names the
    database supplied, and `commonNameFor` / `commonNameInLocale` read them after the bundled ones.
  - `listSpecies` is no longer used by the app; kept on the interface for now.
- **T-212 · Badges were designed for 54 species** — *Director + Claude · S · `TODO` · deps: T-208*
  - Badges count over the Almanac's list, which is now the whole county (~3,000; ~300 birds in
    Kronoberg). "All birds spotted" went from a goal to practically unreachable. Decide the shape —
    e.g. tiered thresholds (10 / 50 / 100 birds) or "the county's 20 most-observed birds" — then
    Claude rebuilds `lib/badges.ts` to it. Deliberately not changed silently in T-208.
- **T-209 · Onboarding runs again on every launch** — *Claude · S · `DONE` · deps: T-090*
  - `App.tsx` holds `onboarded` in plain `useState(false)`: nothing persists it, so every cold start
    replays welcome → age gate → location → notifications. Found while building T-031: a notification
    tap now queues behind a full re-onboarding before its card opens.
  - Persist completion (+ the age path, which gates analytics) device-locally like consent (T-088);
    the hometown is already persisted (T-090). Re-asking OS permissions must not be part of a relaunch.
  - ✅ `lib/onboardingStore.ts`: stores `{agePath}` only (never the birth year). A record without a
    valid age path counts as **not onboarded** — re-running onboarding is safe, silently treating a
    child as an adult is not. Storage failures degrade the same way.
  - ✅ App renders nothing until the record is read, so a returning user never sees the welcome
    screen flash; a stored `restricted` path re-locks analytics on every launch.
  - ✅ **Account deletion now clears the device too**: onboarding record + locked hometown
    (`HometownStore.clear`, reserved for erasure — the lock stops a *user* moving county, not the
    erasure of the account). Tests: relaunch skips onboarding; under-13 stays locked after restart;
    delete → welcome screen with both keys gone.
- **T-210 · Names and card content exist for 54 of 6,824 species** — *Claude · L · `DONE` (loaded + verified live 2026-10-28) · deps: T-177, T-178*
  - Found during T-205: `species_content` holds 2,052 rows = the curated 54 × 38 locales. None of the
    6,770 GBIF species has card content, and `species.common_name` holds the binomial for at least
    some of them ("Erica tetralix", not klockljung / cross-leaved heath). The August full-chain run
    (vernacular + content, all locales) either failed or never loaded — its outcome was never checked.
  - Investigate the run, fix whatever stopped it, load, and verify counts per locale. This is the
    v1 promise (T-177/T-178: every species, every language, free) and it is not met in the database.
  - 🔎 **Root causes** (run 32146425679, 2026-08-18 — red for ten weeks, unseen):
    1. **Content load died on its first curated species.** The species loader adopts the curated id
       for a GBIF key it already holds (`great-tit` for 9705453, T-184); the content loader did not,
       so the row for `gbif:9705453` broke the FK and rolled back **every species in every locale**.
    2. **Names were the binomial** because an early load wrote it into `common_name` and the upsert
       never updated that column again — 11,883 GBIF rows, all of them.
    3. **4 of 54 photos lost** to Wikimedia 429s with no retry.
    4. The generated data had a **14-day** artifact retention, so by the time anyone looked the
       four hours of generation had to be repeated.
  - ✅ Fixes: content rows for curated species are **skipped** (their hand-written 38-locale
    content wins over templates); orphan rows are split off and reported, and the load refuses only
    if >1% are orphans (mismatched runs). Species `common_name` = GBIF English vernacular for GBIF
    rows, null when there is none — and when a run skipped the name fetch, names are left alone
    except for clearing binomial copies (`species_sql(have_names)`); curated names never change.
    Photo download paced 1 s and retried on 429/503 honouring Retry-After. Artifact retention 90
    days. Workflow free-text inputs moved to env — which also fixed the **scheduled** run passing an
    empty `content_scope` straight into `build_content.py "pipeline/data/"` instead of `--all`.
  - ✅ **Verified** (run 40730729091, green, 4h28m):
    - Step times: vernacular 1h55m, content 2h28m, loads under 3 min. That is 1h30m inside the
      6 h job cap. A retry no longer pays for the vernacular step (T-198).
    - Species load: 21 regions, 11,936 species, 78,530 presence rows, 53 curated ids adopted.
    - Content load: 213,894 rows from 214,848 generated; 954 rows were kept as hand-written curated
      content. 0 duplicates, 0 orphans.
    - `species_content` covers **all 11,937 species in each of the 18 v1 locales**. The curated 54
      also keep their 38-locale set.
    - Facts with a citation per locale: sv 4,836 · en 4,694 · vi 4,323 · ru 2,888 · uk 2,536 ·
      tr 1,569 · ar 1,539 · sr 1,252. They are mission-only elsewhere, ~54 in am/ckb/kmr/ps/so/ti.
      These are Wikipedia's real coverage, never machine-translated (T-179).
    - Localized names: sv 5,419 · en 4,919 · ru 3,794 · uk 2,400 · tr 1,305 · ar 973 · sr 938.
      Low-coverage locales fall back to the English, then the scientific name.
    - `species.common_name` on the 11,883 GBIF rows: **0 binomial copies** (was 11,883). 4,865
      hold a real English name. 7,018 are null, so the app shows the scientific name.
    - All 54 curated photos were uploaded (were 50/54).
- **T-211 · The language choice is lost on restart** — *Claude · S · `DONE` · deps: T-123*
  - `localeOverride` in `App.tsx` is plain `useState`; a reload falls back to the device language.
    The push device row then re-registers in that language, so notifications switch language too.
    Persist it device-locally like consent (T-088).
  - ✅ `lib/localeStore.ts` (unsupported or corrupt value → follow the device). The app holds its
    first render until the stored language is read, so a Swedish user never sees an English frame,
    and push registration waits for it too, so the device row is not written in the wrong language
    first. Test: choose Svenska → restart → Swedish UI.
- **T-216 · The Impact screen says "this season" but counts all time** — *Claude · S · `DONE` · deps: T-081*
  - The subtitle reads "The help you've pledged this season", but `impactSummary` counts every
    Helped record ever. The community totals are season-scoped (T-081), so the two numbers
    disagree after the first season change. Either filter the personal summary to
    `season_key(helped_at)` or reword the subtitle. Filtering is the honest fix, since the
    community line is seasonal.
  - ✅ Filtered. `impactSummary(records, season?)` counts only pledges whose `helpedAt` falls in
    the season, with the same key as free catches (December joins the next winter). The Impact
    screen passes the current season, so its numbers match its subtitle and the community line.
    Without a season argument the function still counts everything, for any other caller.
    - 4 tests: season filtering, December grouping, the screen counting only this season, and
      the empty state when every pledge is from an earlier season.
- **T-213 · Turning notifications on in Settings never asked Android** — *Claude · S · `DONE` · deps: T-201*
  - Found while debugging T-205: the Settings switch recorded notification consent without the OS
    permission, so the device registered for pushes the phone then silently dropped — the user
    thinks they opted in and nothing ever arrives.
  - ✅ Switching notifications **on** now requests the permission first and records consent only
    if it is granted (already granted → no dialog). The handler reads consent from a ref, since the
    dialog resolves after the render that started it. Onboarding's grant path records directly (it
    already holds the permission). Test: OS says no → nothing stored; OS grants → stored.
  - Location has the same shape but no current effect — the hometown is derived once at onboarding
    and locked (T-090) — so it is left as is.
- **T-204 · The keep-alive did not keep the project alive** — *Claude · S · `DONE` · deps: T-203*
  - The T-203 job succeeded on Aug 27, Aug 31 and Sep 3 — and the project was **paused anyway** by
    Sep 7 (`status: INACTIVE`). Every run after that failed with `tenant/user … not found`, the
    pooler's answer for a paused project: **seven weeks of red runs that nobody saw.**
  - So a direct Postgres query through the pooler does **not** count as activity for Supabase's
    pause logic. The exact rule is not published and cannot be confirmed from here; the job now also
    makes a REST API request (`/rest/v1/species?select=id&limit=1`), the path the app itself uses
    and therefore the traffic Supabase is most plausibly watching. This is a corrected hypothesis,
    not a verified fix — the next few scheduled runs are the test.
  - The DB query stays, as the health check: REST proves the project is awake, the counts prove it
    still has data.
  - Project restored 2026-10-28 via the Supabase connector, ~53 days into its 90-day restore window.
  - ⚠️ **The real failure was the alert, not the query.** The design assumed a red scheduled run
    would be noticed; it was not, for seven weeks. A monitor whose failures land in an inbox nobody
    reads is not monitoring. Worth checking GitHub's Actions notification settings, so a failed
    scheduled run actually reaches someone.
- **T-203 · Keep the Supabase project from pausing** — *Claude · S · `DONE` (Director request) · deps: T-174*
  - Supabase pauses a free project after **7 consecutive days** without activity, and a paused
    project takes the app down with it. `supabase-keepalive.yml` queries the database on a schedule.
  - **Twice weekly (Mon + Thu), not weekly.** The pause threshold *is* 7 days, so a 7-day cron has
    zero margin — one delayed or skipped run and the project pauses. GitHub does not guarantee
    scheduled runs fire on time; under load they are delayed and occasionally dropped. Mon/Thu puts
    the worst-case gap at 4 days.
  - **It checks the counts, not just that it ran.** A project that is awake and empty is a worse
    state than a paused one, because nothing looks wrong from the outside — the app simply returns
    nothing. An empty or missing table fails the run, which is what makes this a notification rather
    than a log line. It is currently the project's **only continuous monitoring**.
  - Deliberately *not* a week-over-week comparison: growth and churn are T-192's judgement, made
    against a load. The only question here is whether the project is awake and still has data.
  - ⚠️ **GitHub disables scheduled workflows in a repo with no commit activity for 60 days —
    including this one.** A keep-alive that switches itself off during a quiet month is worse than
    having none, because it is silently trusted. Recorded in the workflow header; re-enable from the
    Actions tab, or push anything.
- **T-192 · Refuse a load that looks like a broken ingest** — *Claude · S · `DONE` · deps: T-172*
  - From the loader's point of view a partial ingest and a genuine decline are **identical**: both
    arrive as fewer rows. With a human in the loop that ambiguity was survivable; with T-172's
    unattended schedule it is not.
  - `check_load_sanity` refuses a load below **75%** of the current count, on species *and*
    presence separately — a taxon failing mid-ingest can leave the species list broadly intact while
    gutting presence, so one threshold would not have caught it. 75% tolerates ordinary churn, since
    GBIF lumps species at every backbone release.
  - **An empty incoming dataset never passes**, even against an empty database: it is the most
    dangerous case, recording success while loading nothing and leaving the next run to compare
    against a hollow baseline. An empty *database* passes anything — that is a new project, not
    evidence of a failure.
  - The refusal message names both numbers, so the Actions log is actionable without a re-run.
    8 tests.
- **T-170 · A partial ingest must not discard the whole run** — *Claude · S · `DONE` · deps: T-167*
  - `build_presence.py --all` returns 1 when *any* single taxon fails, and it deliberately keeps
    going so one failure does not lose the rest. But a non-zero step in Actions skips every step
    after it — so one timed-out taxon threw away the artifact upload, the Supabase load and the
    photo upload for a run that had already spent five hours succeeding at the other eight.
  - The four steps after the ingest now run under `!cancelled()`. Not `always()`: an explicit
    cancel should still stop the DB writes, since that is usually someone stopping a run they know
    is wrong.
  - The taxa that succeeded are already written to disk when the step exits, so loading them is
    strictly better than loading nothing. The load is an upsert, so the failed taxon simply arrives
    on the next run.
- **T-169 · Server-side key naming follows Supabase's new API keys** — *Claude · S · `DONE` · deps: —*
  - Supabase replaced the legacy `anon` / `service_role` JWTs with **publishable** and named
    **secret** (`sb_secret_…`) keys; the legacy pair now sits behind a "Legacy" tab and is marked
    deprecated. The client already used the new scheme (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
    T-096) — only the server-side docs still told the Director to fetch a `service_role` key.
  - `$SUPABASE_SERVICE_KEY` keeps its name (renaming it would silently unset a configured CI
    secret) but now documents itself as taking a secret key. Nothing decodes the key — it is passed
    through in the `apikey` / `Authorization` headers — so the non-JWT format needs no code change,
    and legacy keys keep working for as long as Supabase honours them.
  - **Why a named secret key is the better one to issue:** it can be revoked on its own. The legacy
    `service_role` JWT can only be rolled project-wide, which is why the key exposed in an earlier
    chat session could not be cheaply replaced. Issue one key per consumer (`github-actions`) and a
    leak costs exactly that consumer.
  - Also corrected: `$SUPABASE_DB_URL` was described as "service-role", conflating a Postgres
    connection string with an API key. It is neither — it is the `postgres` role, which bypasses
    RLS for a different reason.
- **T-168 · Thumbnail tier: ship ~40 KB, link out for full size** — *Claude · M · `IN-PROGRESS` (pipeline + card done; bulk upload is Director) · deps: T-118, T-119, T-126, T-167*
  - 💾 **Storage forced the design.** At ~6,800 kept Swedish species a full-size photo each would
    fill the 1 GB Supabase free tier before Norway, Denmark, Finland and Iceland are ingested. A
    400px thumbnail is ~40 KB → ~270 MB for Sweden, leaving room for the rest. Invariant #7 holds.
  - ✅ **Commons does the resizing** (`iiurlwidth=400`), so the pipeline downloads ~40 KB rather
    than fetching a multi-megabyte original and shrinking it locally — much faster over thousands
    of species, and considerably kinder to Wikimedia.
  - ✅ `pick_image_urls` (4 tests) picks the shipped image and its full-size counterpart, falling
    back to the original when Commons returns no thumb (SVGs, already-small files): a large image
    beats a glyph on a card where a real photo exists. Returns `None` when there is no original at
    all, because a thumbnail with nothing behind it cannot be attributed — and attribution is a
    licence condition, not a nicety.
  - ✅ **Card hero is tappable** → opens the Commons file page (3 tests). The destination is a happy
    accident of the licence: the page holding the full resolution is the same page holding the
    author and licence, which is exactly what CC-BY / CC-BY-SA ask you to point at. `openURL`
    failure is swallowed — a dead link must not break a delight moment.
  - Full-resolution images are **never re-hosted**. Zero storage, zero egress, and no dependence
    on Wikimedia hotlinking policy for the images we serve.
  - ⏳ Remaining: regenerate the manifests at the new width and run the Storage upload (needs the
    service key — Director), then `media.*.ts` regeneration.
- **T-163 · Dandelion: aggregate the *Taraxacum* microspecies** — *Claude · S · `DONE` (Director chose (a), 2026-08-18) · deps: T-042*
  - GBIF splits *Taraxacum officinale* into hundreds of apomictic microspecies. Sweden's flora data
    holds **216 of them carrying 89,286 observations**, so the app either offered `Taraxacum
    piceatum` as something to spot, or showed a dandelion with a sliver of its real presence.
    Neither is what anyone means by *maskros*.
  - 🔭 **Director decision:** aggregate the microspecies into one card — option (a), over pointing at
    GBIF's aggregate key or dropping the species.
  - `gbif/aggregate_genus.py` merges configured genera per county, summing occurrences and unioning
    active months. Effect on the real data: flora records **23,555 → 22,680**, and dandelion becomes
    present in **all 21 counties with 89,286 observations** — one of Sweden's commonest plants,
    which is the truth a person would recognise.
  - **Configured, never automatic.** Collapsing any genus with many members would be a lie in the
    other direction: most genera hold species a person can genuinely tell apart. Only listed genera
    merge.
  - A genus whose target binomial is absent from the data is **left untouched**: the target's
    `speciesKey` is the app's species id, and borrowing a microspecies' key would produce an id that
    renames itself when the ingest reorders. 8 tests, including that `Taraxacum` cannot swallow a
    hypothetical `Taraxacumoides`.
  - Applied inside `build_presence.py` *before* meta is computed, so the reported counts describe
    what ships rather than GBIF's split. Takes effect on the next ingest.
- **T-164 · Review Supabase security advisories** — *Director · S · `TODO` · deps: —*
  - `get_advisors(security)` reports 5 warnings on the live project. None are caused by the
    T-146/T-160 changes; recorded here so they are triaged rather than rediscovered.
  - `public.profiles` and `public.collection` RLS policies include the `anon` role. This is likely
    *intentional* — the app signs users in anonymously and only later links an email (T-133) — but
    it needs an explicit decision rather than an assumption, since tightening it would lock out
    every pre-link user. Not changed unilaterally.
  - Leaked-password protection (HaveIBeenPwned) is disabled in Auth — a dashboard toggle, Director's
    call, and relevant once email/password linking is live.
  - `cron.job` / `cron.job_run_details` warnings are Supabase-managed tables, not ours.
- **T-158 · Shared conformance suite for translated locales** — *Claude · S · `DONE` · deps: T-154*
  - ✅ `lib/species/contentLocales.test.ts` runs one contract over **every** locale registered in
    `CONTENT_BY_LOCALE`, replacing the per-language test file each T-154 language would otherwise
    need. A new language now needs only its content, its names and its registrations — and cannot
    skip the checks by forgetting to write a test.
  - ✅ Checks per locale: full species parity + no orphans, all four fields non-empty, **content
    differs from the English base** (catches an entry copied in to fill a slot — works for every
    script, unlike a character-range check), expected script where non-Latin, its own honesty
    phrases declared (T-153), honesty clean, names complete, and status `machine` + offerable.

- **T-155 · (optional, non-blocking) Native review pass for dual-display languages** — *Director · L (ongoing) · `WONTFIX for v1` (T-177) · deps: T-154*
  - Downgraded from a blocker to a future quality upgrade per T-152's resolution — dual display
    ships on `machine` status. If/when native review happens for a language (e.g. to eventually
    retire its "machine-translated" tag), prioritize by actual Sweden immigrant-population share
    (Director to confirm order against real data; the T-156 list is a first-pass estimate).
- **T-156 · `ContentLocale`: widen the dual-display roster beyond the 24 EU languages** — *Claude · M · `DONE` · deps: T-124*
  - ✅ `lib/i18n/contentLocale.ts` (15 tests): `ImmigrantLocale` (16 languages, ordered by rough
    immigrant-population share = the T-154 translation priority), `ContentLocale = Locale |
    ImmigrantLocale`, `CONTENT_LOCALES`, `isImmigrantLocale`. `LOCALE_ENDONYMS` gives every locale
    its **own-script name** (العربية, ትግርኛ, Soomaali) — a mother-tongue picker must show endonyms,
    and they're a data table rather than `Catalog` keys precisely because an endonym is identical in
    every UI language. `contentLocaleStatus` reads EU status from the existing `coverage.ts` matrix
    and immigrant status from a new one (all `missing` until T-154 seeds them).
  - ✅ **T-152's policy encoded in one place**: `isOfferableForDualDisplay` (status ≠ `missing` —
    `machine` is enough), `dualDisplayLocales()`, `needsMachineTranslationNotice` (status =
    `machine`). Tested explicitly against the stricter `isLiveForUsers` bar so the two policies
    can't silently converge.
  - ✅ `species/localized.ts` `contentFor`/`commonNameFor` now accept a `ContentLocale`; unseeded
    locales miss the lookup and fall back to English exactly as before. `Locale` (UI chrome) is
    deliberately **unchanged** — see the rationale in the module header.
  - Architecture decision: introduce a **separate `ContentLocale` type** (EU `Locale` ∪ the
    priority immigrant languages — ar, so, fa, ps, ckb, kmr, tr, ti, bs, sr, sq, ru, uk, th, vi,
    am) used only by species-content lookup (`species_content`) and this feature's coverage
    tracking — rather than widening the app-wide `Locale`/UI-`Catalog` type, which would
    compile-force UI-chrome translations for ~15 more languages that aren't in scope (this feature
    is content-only, per the brief). Extend `lib/i18n/coverage.ts`'s status tracking (or a sibling
    module) to the new locales, all starting `missing`. Record the rationale (content-only scope,
    not full UI localization) in [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md). Tests: the
    new locales are distinct from `Locale`, and `species_content` lookups accept a `ContentLocale`.
- **T-157 · RTL-safe rendering for the secondary language slot** — *Claude · M · `DONE` · deps: T-156*
  - ✅ `lib/i18n/bidi.ts` (12 tests): `RTL_CONTENT_LOCALES` (ar, fa, ps, ckb), `isRtlLocale`,
    `writingDirectionFor`, `textAlignFor`, and `isolate`/`stripIsolates` using Unicode FSI/PDI
    (UAX #9). **Script decides direction, not language family** — Sorani (ckb, Arabic script) is
    RTL while Kurmanji (kmr, Latin script) is LTR; Tigrinya/Amharic (Ge'ez) and Thai are non-Latin
    but LTR. Both are pinned by tests.
  - ✅ **Why the "/" join can't be a plain template literal:** the delimiter and spaces are
    directionally *neutral*, so next to an RTL run the bidi algorithm absorbs them into it and the
    "/" visually jumps to the wrong side. Isolating each half keeps it anchored between them.
    Tested with real Arabic/Persian strings — a Latin placeholder would pass while the device broke.
  - ⚠️ Scope is **mixed-direction-within-a-screen**, not app RTL mirroring (layout/nav stay LTR).
  - ✅ **Verified on a real render** (web build driven headlessly), which caught a bug the unit
    tests could not: React Native Web emits `dir="auto"` on `Text`, and Chromium resolves that from
    the first strong character **without** skipping isolate contents — unlike UAX #9's own P2 rule.
    A line starting with an RTL endonym therefore flipped entirely, displaying
    "Machine-translated · العربية" instead of "العربية · Machine-translated". **Isolates alone do
    not fix this**; mixed-direction chrome lines need an explicit `writingDirection`. Applied to the
    card title and the MT notice, with a regression test asserting the style. Lesson recorded: bidi
    correctness cannot be fully unit-tested — it needs looking at pixels.
  - Several T-156 languages are RTL scripts (Arabic, Persian/Dari, Pashto, Sorani Kurdish) —
    the "all 24 EU languages are LTR" assumption in INTERNATIONALIZATION.md doesn't extend to this
    feature. Scope: per-language RTL flag on `ContentLocale`; the secondary paragraph in
    `formatDualBody`'s consumer gets its own `writingDirection`/text-align without mirroring the
    rest of the (LTR) card layout — this is *mixed-direction-within-a-screen*, not full app RTL
    support (out of scope). The title's "/" join (T-149) must stay legible with an RTL secondary
    half — verify with Unicode bidi control characters if plain concatenation misorders the glyphs
    (test with a real Arabic/Persian string, not a placeholder). Tests: RTL flag lookup per locale;
    bidi-safe title join with an RTL secondary string.

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
- **T-119 · Source Wikimedia Commons photos (Kronoberg set)** — *Claude + Director · L · `DONE` (54/54 uploaded 2026-10-28) · deps: T-118 · [DATA-SOURCING §5](DATA-SOURCING-LICENSING.md)*
  - ✅ Sourcing: `pipeline/build_kronoberg_media.py` reads the curated 54 from `kronoberg.ts`, queries
    Wikipedia + Commons (reusing the tested `media/wikimedia.py`/`licenses.py`), and writes
    `pipeline/data/media_kronoberg.json` — **54/54 (100%) with a commercial-safe photo**
    (40 CC-BY-SA, 9 CC-BY, 5 CC0), author + license + source page captured per photo.
  - ✅ Manifest: `scripts/gen-kronoberg-media.ts` → `lib/species/media.kronoberg.ts` (typed
    `KRONOBERG_MEDIA`) with the **deterministic Supabase Storage public URLs**
    (`species-media/<id>.<ext>`). `media.test.ts` guards licenses, full attribution, species mapping,
    and 100% coverage. **Chosen approach: re-host, not hotlink** — Wikimedia discourages app-scale
    hotlinking; re-hosting gives reliability/perf/privacy and snapshots attribution.
  - ⏳ **Director:** run `pipeline/media/supabase_upload.py` with `SUPABASE_URL` + a **secret key**
    key to create the public `species-media` bucket and upload the 54 originals (unmodified;
    resize on delivery). Until then the app shows the emoji fallback for spotted species (no breakage).
    Spot-check licensing. National-scale sourcing (the ~12k set) reuses the same pipeline (E3, gated
    by content T-135 + curation T-136).
  - ✅ **Done (verified 2026-10-28):** the data pipeline's Storage step now runs the upload with the
    repo secret, so no one runs it by hand. Run 40730729091 uploaded **54/54** curated photos to
    `species-media` (before the T-210 pacing and retry, 4 had been lost to 429s). The cards show
    them. The national-scale sourcing this task anticipated is T-202, done: 4,797 photos.
- **T-126 · Species card renders photos** — *Claude · M · `DONE` · deps: T-118, T-119, T-059 · [USER-FLOWS §3,§4](USER-FLOWS.md)*
  - ✅ `components/SpeciesHero.tsx` renders the real photo on the species card **once spotted**
    (keeps the pre-spot silhouette so discovery still means something), with a graceful
    category-glyph fallback if there's no photo or the image fails to load (e.g. before the Storage
    upload), and shows per-photo attribution (author + license) — required for CC-BY/CC-BY-SA.
  - ⏳ Almanac grid thumbnails intentionally **kept as silhouettes/emoji** for now (the silhouette
    reveal mechanic + not fetching 54 grid images); revisit whether spotted cells show photos.
  - ✅ **Revisited (2026-10-29): spotted cells show their photo; undiscovered cells keep the
    silhouette.** Both reasons for deferring have gone:
    - The reveal still happens at the moment of spotting.
    - Photos arrive with the `region_catalogue` read (T-215), so the grid makes no extra requests,
      only image loads, which `FlatList` virtualizes.
    - A failed load falls back to the glyph, and so does a species without a photo.
    - The credit is not on the 56 px thumbnail. The card one tap away carries author + licence in
      full. The CC licences allow attribution "in any reasonable manner based on the medium", and a
      thumbnail cannot carry a readable credit.
    - 4 tests in `AlmanacScreen.test.tsx`.

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
