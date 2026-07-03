# Contributing — Nearby (nearlife)

Read [CLAUDE.md](CLAUDE.md) first — it is the binding way of working (TDD, quality gate,
one task per push, task-plan discipline). This file is the practical dev setup.

## First-time setup

```sh
npm install            # installs deps; the `prepare` script wires the git hooks path
sh scripts/setup-hooks.sh   # (optional belt-and-suspenders; also chmods the hook)
```

## Daily commands

| Command | What it does |
|---------|--------------|
| `npm start` | Expo dev server (press i / a / w for iOS / Android / web) |
| `npm run lint` | ESLint (flat config, Expo + Prettier) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Jest (via `jest-expo`) |
| `npm run verify` | lint + typecheck + test — **the quality gate** |

`npm run verify` is what the pre-push hook and CI run. If it's red, the push is blocked
(don't bypass with `--no-verify`).

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
| `.githooks/`, `.github/` | Quality gate: pre-push hook + CI backstop |

## Workflow in one line

Pick the lowest-numbered unblocked `TODO` task in the current phase from
[docs/TASK-PLAN.md](docs/TASK-PLAN.md) → write a failing test → make it pass → `npm run verify`
green → update the task's status in the plan → one commit → push.
