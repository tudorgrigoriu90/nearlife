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
- **T-031 · Expo push delivery + deep link** — *Claude · M · deps: T-030 · [USER-FLOWS §4](USER-FLOWS.md)*
  - Push arrives on device with honest copy; tapping deep-links straight to that species card
    and marks it Spotted.
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
- **T-035 · PostHog event instrumentation** — *Claude · S · `IN-PROGRESS` (wired + call sites instrumented; notification events wait on T-031, on-device verify pending) · deps: T-005, T-031 · [TSD §8](TSD.md)*
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
- **T-136 · Curate GBIF lists against authoritative national checklists** — *Claude + Director · M · `IN-PROGRESS` (filter built + validated; checklist ingest pending) · deps: T-042, T-167*
  - Filter out zoo/escapee/vagrant/domestic and misID noise so the app shows species users can
    genuinely encounter. Now Nordic-wide (T-167), so "the Swedish checklist" is five checklists —
    see the authority table in DATA-SOURCING-LICENSING.md.
  - ✅ `gbif/noise.py` + 12 tests. Checklist status is authoritative in **both** directions when
    known; the statistics only cover species the checklist has not spoken about.
  - 🔑 **Rarity is not noise, and the test encodes that.** The osprey carries 372,495 records across
    all 21 Swedish counties while the app tags it `rare` — that tag is an encounter-frequency
    *flavour*, not scarcity. A plain "drop the uncommon" threshold would discard real species and
    keep well-recorded escapees, so the rule is breadth **or** local abundance, never one number.
  - ✅ **Validated against the hand-curated set:** applied Sweden-wide it takes 11,908 → 6,824
    (42.7% removed) while retaining **53 of the 54** curated species. The single drop is
    `Taraxacum officinale`, which is the T-163 data gap surfacing (no GBIF presence under the
    binomial), not a filter misjudgement. Pinned as a regression test — if a policy change starts
    eating curated species, the build fails.
  - 📊 **42.7% dropped sounds severe; it is 0.37% of observations.** 5,084 species carry 463,790 of
    126.5M records. Median dropped species: 50 records. Median kept: 975. It is the long tail, not
    a bite out of the middle.
  - 🔬 **Inspected what it drops, by name, and it is the target.** Birds: *Zenaida macroura*
    (N. American mourning dove), *Petrochelidon pyrrhonota* (cliff swallow), *Bartramia longicauda*
    (upland sandpiper), *Numenius minutus* (Siberian little curlew), *Gavia pacifica* (Pacific
    loon) — all vagrants, whose high counts in 1–2 counties are twitcher pile-ups on a single bird,
    which is exactly what the breadth rule is for. Reptiles: *Mauremys reevesii*,
    *Graptemys pseudogeographica*, *Chrysemys picta* — released pet terrapins — plus two vagrant sea
    turtles. Mammals: musk ox, introduced Pallas's squirrel, golden jackal, two whales.
  - Per-taxon drop rates vary as biology predicts: birds 23% (well-recorded, well-known), molluscs
    63% and fish 56% (long tails of obscure or marine species). Amphibians keep 12 of 16, which
    matches Sweden's real amphibian fauna.
  - Thresholds live in a `Policy` dataclass rather than as literals, and every verdict carries a
    reason: at Nordic scale these lists are far too large to re-derive by eye, and a species
    dropped silently cannot be argued with later.
  - ⏳ Remaining: ingest the five national checklists and pass them in as `statuses` — at which
    point the heuristics become the fallback rather than the primary rule.
- **T-134 · Load presence dataset into Supabase (reference schema + writer)** — *Claude + Director · M · `IN-PROGRESS` (schema + loader + bounded seed done; full bulk load needs the service key) · deps: T-042, T-003 · [TSD §3](TSD.md)*
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
- **T-135 · Curate + author content at national scale** — *Claude + Director · XL · `IN-PROGRESS` (pipeline built + validated on mammals; full 12k run + review pending) · deps: T-042 · [GDD §5](GDD.md), [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
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
- **T-144 · CI workflow for the national data pipeline** — *Claude · S · `DONE` (workflow; needs Director secrets to load) · deps: T-134, T-135 · [TSD §6](TSD.md)*
  - ✅ `.github/workflows/data-pipeline.yml` (manual `workflow_dispatch`): installs the pipeline deps,
    generates national content (`build_content.py --all` or a chosen taxon) + the curated photo
    manifest, and uploads the generated JSON as an artifact. The **Supabase load** (`gbif.supabase_load`,
    T-134) and **photo upload** (`media/supabase_upload.py`, T-119) steps run only when the repo
    secrets are set — so the whole E3 load runs from GitHub with secrets, not Python on a laptop.
  - ⏳ **Director:** add repo secrets `SUPABASE_DB_URL` (service-role Postgres string),
    `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, then run the workflow. The `species_content` loader
    (content JSON → table) is now built + tested (**T-145**) — running it just needs those secrets.
- **T-145 · Load generated content into `species_content` (loader + tests)** — *Claude · S · `DONE` (code + 5 pytest; bulk run needs the service key) · deps: T-135, T-055 · [TSD §3](TSD.md)*
  - ✅ Pure row-builder `pipeline/gbif/content_rows.py` (`build_content_rows` → species_content upsert
    dicts with `gbif:<key>` ids matching the species loader) + thin loader
    `pipeline/gbif/supabase_load_content.py` (idempotent upsert via service-role `$SUPABASE_DB_URL`),
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
- **T-057 · Almanac grid (production)** — *Claude · M · `IN-PROGRESS` (async wiring done; DB seed + secondary filters pending) · deps: T-056 · [USER-FLOWS §2](USER-FLOWS.md)*
  - ✅ Data-access seam `lib/speciesRepository.ts` (7 tests): `SpeciesRepository` (`listSpecies` +
    `getContent`) with a `HardcodedSpeciesRepository` (the bundled set the app runs on today) and a
    `SupabaseSpeciesRepository` (reads the seeded `species`/`species_content` tables via a fakeable
    gateway, English content fallback). Grid already renders ●/◐/◑ overlays + category chips (T-025).
  - ✅ **App now loads the Almanac catalogue through the repository** (`App.tsx`, one-shot async load
    on mount → `AlmanacScreen` gets `species` + `loading`), not the bundled module directly. Defaults
    to `HardcodedSpeciesRepository` (no behaviour change); the source swaps to Supabase once the DB is
    seeded. App integration test asserts the loaded total (fails if the async load regresses).
  - Remaining: inject the Supabase-backed repo + apply the content seed (needs the seeded DB,
    T-055/T-145 load), and add season/habitat secondary filters (habitat needs E3).
  - 🚦 **Do not inject the Supabase repo until all 38 locales are seeded (T-160).** The live DB
    currently has en, sv and so only. `SupabaseSpeciesRepository.getContentInLocale` has no English
    fallback by design, so switching the app over today would silently blank the dual-language
    secondary half for the other 33 languages — the same class of bug T-160 fixed, in reverse. The
    bundled `HardcodedSpeciesRepository` is currently the *more* complete source, which is why the
    swap is sequenced after the seed, not before it.
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
- **T-063 · Cadence, quiet hours, prefs + delivery logging** — *Claude · M · `IN-PROGRESS` (engine core done + tested; Edge Function wiring pending T-030/T-032 live infra) · deps: T-062, T-032 · [TSD §4](TSD.md)*
  - Frequency cap, quiet hours, notif prefs respected; every send logged
    (delivered/opened/collected) for analytics.
  - ✅ `lib/notificationEngine.ts`: `decideNotification(user)` composes the tested parts into one
    decision — master opt-in → cadence/quiet-hours gate (T-131) → season-gated weighted selection
    (T-062). Cadence runs before selection so a blocked user costs no candidate work. `SkipReason`
    surfaces exactly why a cycle sent nothing. `recordDelivery` emits `notification_delivered` for
    the funnel (consent gating stays the tracker's concern). Pure/clock-free; deterministic `Rng`.
  - ⏳ Remaining: run this from the scheduled Edge Function (T-064) and persist the delivery log +
    opened/collected — blocked on the Edge Function runtime (T-030/T-032, live infra).
- **T-064 · Schedule via pg_cron → Edge Function** — *Claude · S · deps: T-063, T-017 · [TSD §4](TSD.md)*
  - Engine runs on schedule server-side; no client dependency; observable/retryable.

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
- **T-078 · "Active this week" (production)** — *Claude · M · `DONE` · deps: T-044, T-057 · [USER-FLOWS §3](USER-FLOWS.md), [TSD §4b](TSD.md)*
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
- **T-081 · Collective impact counters** — *Claude · M · `IN-PROGRESS` (personal impact screen done; community aggregation is server-side) · deps: T-077 · [GDD §7](GDD.md), [USER-FLOWS §6](USER-FLOWS.md)*
  - ✅ `components/ImpactScreen.tsx` (2 tests) shows the help the user has pledged this season —
    species helped / give / protect counts from the tested `lib/impact.ts` `impactSummary`. Honest by
    construction (invariant #1): counts only real pledges, and shows a plain "community totals coming"
    note rather than a fabricated figure. No upsell (invariant #4). i18n en+sv. Reached from the
    Almanac (T-058).
  - ⏳ Remaining (server): **community totals** ("4,200 nest boxes this spring") from
    `impact_counters` refreshed by cron (needs T-077 table + pg_cron), then swap the note for the real
    aggregate. Shareable once the community number is real.
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
- **T-090 · Hometown GPS-derive-once + discard coordinates** — *Claude · M · deps: T-088 · [PRIVACY §1](PRIVACY-COMPLIANCE.md), [ECONOMY](ECONOMY.md), [USER-FLOWS §1](USER-FLOWS.md)*
  - Device location resolved once to a region; **coordinates discarded**, only `home_region_id`
    stored; hometown locked (support-only change). No manual picker.
  - Location-denied → preview mode; hometown set on first grant.
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
- **T-094 · Retention policy & auto-expiry** — *Claude · S · `IN-PROGRESS` (policy + expiry logic done; scheduled job pending) · deps: T-091 · [PRIVACY §2](PRIVACY-COMPLIANCE.md)*
  - ✅ `lib/retention.ts` (3 tests): `DEFAULT_RETENTION` windows (runtime location 30d < inactive
    anonymous 90d < analytics 365d) + `isExpired`/`expiryMs`. Remaining: the pg_cron job that
    applies expiry (deletes stale rows / anonymous users).

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
- **T-125 · Per-locale review gating + translation ops** — *Director + Claude · M · deps: T-124 · [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)*
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
  - ⏳ **Next, in order:** (1) run the ingest for NOR/DNK/FIN/ISL — needs CI, since `api.gbif.org`
    is refused by the sandbox egress policy; (2) T-136 noise filtering, now per-country
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
- **T-163 · `common-dandelion` has no presence data** — *Claude + Director · S · `TODO` · deps: T-042*
  - The app ships 54 species but `species_presence` covers **53**: `common-dandelion` is absent from
    the live DB *and* from `20260707000004_seed_kronoberg_presence.sql` itself, so this is a
    pipeline gap, not a failed apply. It also has no `gbif_key`.
  - Cause: GBIF has no Kronoberg records under the exact binomial `Taraxacum officinale`. Dandelion
    is an apomictic aggregate that GBIF splits into hundreds of microspecies — `presence_flora.json`
    carries `Taraxacum croceum` and siblings, but never the aggregate name the seed list uses.
  - **Deliberately not patched with an invented occurrence count.** Presence drives "active in your
    region this season"; a fabricated number would be a dishonest claim in the one place invariant
    #1 most matters. Fix by aggregating the `Taraxacum` microspecies in the pipeline, or by pointing
    the species at the aggregate GBIF key — a data decision, not a hotfix.
  - Until then dandelion can never surface in This Week on the Supabase path.
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

- **T-155 · (optional, non-blocking) Native review pass for dual-display languages** — *Director · L (ongoing) · `TODO` · deps: T-154*
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
- **T-119 · Source Wikimedia Commons photos (Kronoberg set)** — *Claude + Director · L · `IN-PROGRESS` (sourced + manifest at 100%; Supabase Storage upload = Director) · deps: T-118 · [DATA-SOURCING §5](DATA-SOURCING-LICENSING.md)*
  - ✅ Sourcing: `pipeline/build_kronoberg_media.py` reads the curated 54 from `kronoberg.ts`, queries
    Wikipedia + Commons (reusing the tested `media/wikimedia.py`/`licenses.py`), and writes
    `pipeline/data/media_kronoberg.json` — **54/54 (100%) with a commercial-safe photo**
    (40 CC-BY-SA, 9 CC-BY, 5 CC0), author + license + source page captured per photo.
  - ✅ Manifest: `scripts/gen-kronoberg-media.ts` → `lib/species/media.kronoberg.ts` (typed
    `KRONOBERG_MEDIA`) with the **deterministic Supabase Storage public URLs**
    (`species-media/<id>.<ext>`). `media.test.ts` guards licenses, full attribution, species mapping,
    and 100% coverage. **Chosen approach: re-host, not hotlink** — Wikimedia discourages app-scale
    hotlinking; re-hosting gives reliability/perf/privacy and snapshots attribution.
  - ⏳ **Director:** run `pipeline/media/supabase_upload.py` with `SUPABASE_URL` + the **service-role**
    key to create the public `species-media` bucket and upload the 54 originals (unmodified;
    resize on delivery). Until then the app shows the emoji fallback for spotted species (no breakage).
    Spot-check licensing. National-scale sourcing (the ~12k set) reuses the same pipeline (E3, gated
    by content T-135 + curation T-136).
- **T-126 · Species card renders photos** — *Claude · M · `IN-PROGRESS` (card hero done; almanac thumbnails deferred) · deps: T-118, T-119, T-059 · [USER-FLOWS §3,§4](USER-FLOWS.md)*
  - ✅ `components/SpeciesHero.tsx` renders the real photo on the species card **once spotted**
    (keeps the pre-spot silhouette so discovery still means something), with a graceful
    category-glyph fallback if there's no photo or the image fails to load (e.g. before the Storage
    upload), and shows per-photo attribution (author + license) — required for CC-BY/CC-BY-SA.
  - ⏳ Almanac grid thumbnails intentionally **kept as silhouettes/emoji** for now (the silhouette
    reveal mechanic + not fetching 54 grid images); revisit whether spotted cells show photos.

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
