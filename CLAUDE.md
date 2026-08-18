# Way of Working — Nearby (nearlife)

> **v1 scope (Director, 2026-08-18 — T-177):** **Sweden only.** Every species that clears the
> T-136 noise filter ships — **6,824 species**, fauna and flora, carrying **99.63%** of all
> recorded observations. There is **no per-species human verification gate**: the noise filter
> is the quality bar. The other four Nordic countries are v2. The 54-species Kronoberg set
> remains the content-voice benchmark, not the catalogue. **All shipped content is translated
> into the full immigrant-language roster, free for every user (T-178)** — no language paywall.

Operating rules for Claude on this repository. These are binding defaults, not suggestions.
When a rule here conflicts with a one-off user instruction in the moment, the in-the-moment
instruction wins for that task only — the defaults below resume afterward.

## Roles
- **Director** (Tudor) — admin/human-only work: paid accounts, legal sign-off, store
  submission, real-user testing, business decisions. See the assignee legend in
  [docs/TASK-PLAN.md](docs/TASK-PLAN.md).
- **Claude** — all build work: code, schema, pipeline, content, UI, tests, docs.

## The task plan is the backlog
- [docs/TASK-PLAN.md](docs/TASK-PLAN.md) is the source of truth for what to build and in what
  order. Work top-to-bottom by phase; respect the 🚦 validation gate — **no Phase 2 work
  before the gate passes**.
- Work **one task at a time**, by its ID (`T-###`). Pick the lowest-numbered unblocked `TODO`
  in the current phase unless told otherwise.
- Before starting a task, confirm its `deps:` are all `DONE`. If blocked, mark it `BLOCKED`
  with a one-line reason and move to the next unblocked task.
- A task is `DONE` only when **every acceptance-criteria bullet is true** and the six
  cross-cutting invariants at the end of the task plan hold. If a criterion can't be met,
  split the task or raise it — never silently mark done.

## Test-Driven Development (mandatory)
- **Red → Green → Refactor.** Write a failing test that expresses the acceptance criterion
  first, make it pass with the simplest code, then refactor with tests green.
- No production code without a test that would fail if the behavior regressed — for app logic,
  data-access, the notification engine, pipeline transforms, and entitlement/free-catch
  enforcement especially.
- Security- and correctness-critical rules get explicit tests: free-catch enforcement is
  server-side (T-075), catch-spot safety exclusions (T-049), NC-license filtering (T-042),
  honest-copy rule (T-066).
- The full test suite + typecheck + lint must be green before every push.

## Quality gate (enforced)
- **Authoritative gate: GitHub Actions CI** — `.github/workflows/ci.yml` runs the verify pipeline
  (`npm run verify` = lint + typecheck + test) plus the Python pipeline checks on every push to
  `main` and on every PR. A red run is a failed gate: fix the code, don't disable the check.
- **The local pre-push hook was removed** (T-142) — it was slow, easy to have unconfigured, and
  redundant with CI. There is no `core.hooksPath` / `setup-hooks.sh` step anymore.
- **Run `npm run verify` locally before you push.** Because pushes go straight to `main` (no PRs),
  CI runs *after* the push — it reports and notifies on a red `main` but does not block the push.
  Keeping `main` green is on the author; the local verify run is how you stay ahead of CI.
- If you ever want CI to *block* bad code instead of just reporting it, switch to PRs + branch
  protection with a required `Verify` status check (a workflow change, currently out of scope).
- Governance task: **T-109** (original hook + CI backstop), superseded for the local hook by **T-142**.

## Git workflow
- **Push directly to `main`.** No feature branches, no PRs for this repo (solo + Claude).
- **One task per push.** Each push corresponds to exactly one completed `T-###` (plus its
  test and doc updates). Never batch multiple tasks into one push.
- Commit subject starts with the task ID: `T-042: weighted species sampling in notification
  engine`. Body explains the *why* when the choice isn't obvious.
- End commit messages with the standard co-author trailer:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Only push when the task is complete, tests are green, and the task plan + docs are updated
  (below). Confirm the working tree is clean afterward.

## Every push updates the task plan
- With the same push that completes a task, update that task's status in
  [docs/TASK-PLAN.md](docs/TASK-PLAN.md) (`TODO` → `DONE`, or `IN-PROGRESS`/`BLOCKED` as
  appropriate).
- If the work revealed new tasks, append them with the next free `T-###` (never renumber
  existing IDs) and note dependencies.
- The task plan and the code never drift: the plan reflects reality as of every push.

## Documentation & explaining coding choices
- Update the design docs when the build teaches us something the docs got wrong or left open
  (e.g. a tuning value, a schema refinement, a resolved open question). Docs in `docs/` stay
  true to the shipped code.
- When a coding decision is non-obvious — a trade-off, a rejected alternative, a
  correctness/perf/security reason — record it. Short rationale in the commit body for local
  choices; a note in the relevant doc (or an ADR-style entry) for architectural ones.
- Code comments state constraints the code can't show, not narration. Match surrounding style.

## Design invariants (never violate — from the design docs)
1. **Honest copy** — "active in your region this season," never "here right now."
2. **Mission never gated** — Tier-1 fact + all give/protect content free for every species.
3. **No ads anywhere** — no ad SDK ships.
4. **No upsell on delight moments** — collect, catch-success, and help stay clean.
5. **Safety first** — catch spots on public/accessible land only; hazards hard-excluded.
6. **Consent & deletion first-class** — reachable from Settings at all times.
7. **Cost ≈ $0 at MVP scale** — free tiers only; flag anything that would incur cost.

## Stack (see [docs/TSD.md](docs/TSD.md))
Expo (React Native) + TypeScript · Supabase (Postgres + PostGIS, Auth, Edge Functions,
pg_cron) · H3 · MapLibre · Python pipeline in GitHub Actions · RevenueCat · PostHog.
Prefer these; don't introduce new dependencies without a recorded reason.
