# Contributing — Nearby (nearlife)

Read [CLAUDE.md](CLAUDE.md) first — it is the binding way of working (TDD, quality gate,
one task per push, task-plan discipline). This file is the practical dev setup.

## First-time setup

```sh
npm install            # installs deps
```

## Daily commands

| Command | What it does |
|---------|--------------|
| `npm start` | Expo dev server (press i / a / w for iOS / Android / web) |
| `npm run lint` | ESLint (flat config, Expo + Prettier) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Jest (via `jest-expo`) |
| `npm run verify` | lint + typecheck + test — **the quality gate** |

`npm run verify` is what CI runs (the authoritative gate — `.github/workflows/ci.yml`). Run it
locally before every push: pushes go straight to `main`, so CI runs *after* the push and reports
(does not block) a red `main`. Keeping `main` green is on you.

## Repository structure

| Path | Purpose |
|------|---------|
| `App.tsx`, `index.ts` | App entry (expo-router / `app/` routes introduced when multi-screen nav lands) |
| `app/` | Screens / routes (per [USER-FLOWS.md](docs/USER-FLOWS.md)) |
| `components/` | Reusable UI components |
| `lib/` | Non-UI logic: Supabase client, data access, domain helpers (unit-tested) |
| `pipeline/` | Python data pipeline (GBIF/OSM → Supabase); see [TSD §6](docs/TSD.md) |
| `supabase/` | Database migrations, Edge Functions, seed data |
| `assets/` | Icons, images |
| `docs/` | Design docs + [TASK-PLAN.md](docs/TASK-PLAN.md) (the backlog) |
| `.github/` | Quality gate: GitHub Actions CI (`workflows/ci.yml`) |

## Workflow in one line

Pick the lowest-numbered unblocked `TODO` task in the current phase from
[docs/TASK-PLAN.md](docs/TASK-PLAN.md) → write a failing test → make it pass → `npm run verify`
green → update the task's status in the plan → one commit → push.
