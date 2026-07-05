# Validation Go/Kill Criteria — Kronoberg Prototype

> **Status: DRAFT — pending Director approval (T-036).** Committed *before* recruiting testers so
> the bar is set honestly in advance, not rationalised afterwards. Once approved, this file is
> frozen for the duration of the test run (T-039); changing it mid-test invalidates the result.

## What this decides

The single thesis (GDD §9): **does passive collecting feel rewarding, or hollow?** The fake-it
Kronoberg prototype (E2) exists only to answer this before the real data layer (E3+) is built.
This document defines — numerically and qualitatively — what counts as **GO**, **ITERATE**, or
**KILL** at the decision gate (T-041).

## Reading the numbers (n ≈ 25)

The spring test recruits ~20–30 local testers (T-038/T-039). At this sample size the percentages
below are **directional, not statistically significant**. Behaviour + interviews outweigh any
single metric; a metric near a boundary is decided by the qualitative signal, not the decimal.
No cherry-picking: the pre-registered primary metrics are the two in **bold** below.

## Primary metrics (these two decide it)

| Metric | Definition | KILL | ITERATE | GO |
|--------|-----------|------|---------|-----|
| **Would-be-disappointed** | % of active testers who answer "very disappointed" if Nearby went away (Sean Ellis PMF question), asked in the exit interview | < 25% | 25–40% | **≥ 40%** |
| **Day-7 return** | % of testers who open the app on day 7 (any surface), notifications allowed | < 20% | 20–35% | **≥ 35%** |

Both must clear the GO band for an unqualified GO. One GO + one ITERATE → **ITERATE**. Any KILL
on a primary metric → **KILL** unless the qualitative signal is overwhelmingly positive (Director
judgement, recorded).

## Secondary metrics (context + diagnosis, not gates)

| Metric | Definition | Healthy signal |
|--------|-----------|----------------|
| Notification open rate | opened ÷ delivered, sustained across the run (not just day 1) | ≥ 25% sustained; a decaying rate that flattens is fine, a collapse to ~0 is a red flag |
| Passive-collect depth | median species Spotted per tester in week 1 | ≥ 8 (the drip feels like a collection, not a trickle) |
| Non-notification pull | % of sessions that start from This Week / organic open rather than a notification tap | ≥ 25% (proves the app isn't purely notification-driven — the T-078 risk) |
| Catch taste | % of testers who complete ≥ 1 catch minigame | ≥ 40% (the three-tier feel is being sampled, not ignored) |
| Free-catch → intent | % of testers who use all 3 free catches | tracked for the economy funnel; not a v1 gate |

## Qualitative signal (weighted equally with the primary metrics)

From the exit interviews (T-039), look for the difference between **rewarding** and **hollow**:

- **Rewarding (GO-leaning):** unprompted delight at a specific species; checking the app "to see
  what's around" without a notification; describing it as calming/curiosity-satisfying; wanting
  their region "completed."
- **Hollow (KILL-leaning):** "nice but I forgot about it"; notifications felt like a chore or
  spam; couldn't say what they got out of it; no emotional beat at any sighting.

## Decision (T-041)

The Director records **GO / ITERATE / KILL** against the bands above with written reasoning:
- **GO** → Phase 2 begins (real data layer, E3+).
- **ITERATE** → loop selected E2 tasks (cadence, copy, first-run payoff) and re-test in a fresh
  window; do **not** proceed to Phase 2.
- **KILL** → stop. The thesis failed and no engineering saves it (GDD §9).

## Instrumentation dependency

Every metric above is derivable from the PostHog events in **T-035** (notification
delivered/opened, species spotted, catch attempted/succeeded, session start, This Week opened)
and the funnel dashboard in **T-037**. If an event needed for a *primary* metric is missing at
test start, that is a launch blocker for the test run.
