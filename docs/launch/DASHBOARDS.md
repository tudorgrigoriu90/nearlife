# Dashboards (PostHog)

How to build the analytics dashboards in PostHog, click by click. Every event named here is one the
app really sends (`lib/analytics.ts`). A test fails if a name below stops matching the code
(`__tests__/dashboardsDoc.test.js`), so this page can't silently drift.

**What these numbers can and can't show:**
- **Only people who allowed analytics are counted.** Events stop on the phone without consent
  (`ConsentGatedTracker`). Every rate here describes consenting users, and the totals undercount
  everyone. That's by design (no ads, consent first), so read rates, not raw counts.
- **No location and no identity:** events carry species ids, product ids and screen names only.

Before you start: PostHog → your project (EU Cloud) → **Dashboards → New dashboard**. For each
insight: **New insight**, pick the type, set it up as described, **Save**, then **Add to
dashboard**.

---

## 1. Validation (T-037): the go/kill numbers

The two primary metrics in [VALIDATION-CRITERIA.md](../VALIDATION-CRITERIA.md), plus their
context.

**Events used:** `session_start`, `species_spotted`, `notification_opened`, `this_week_opened`,
`catch_attempted`, `catch_succeeded`

| Insight | Type | Set-up |
|---|---|---|
| **Day-7 return** (primary) | Retention | Start event `session_start` · Return event `session_start` · Period **Day** · show day 7. Go ≥ 35%, kill < 20%. |
| **Onboarding → spot → return** | Funnel | Steps `session_start` → `species_spotted` → `session_start`. Window **14 days**. Step 3 is the same person coming back another day. |
| **Notification open rate** | Trends | `notification_opened`, total count per day. Divide by sends, which are counted in the database, not PostHog (see the note below). Go ≥ 25% sustained. |
| **Non-notification pull** | Trends, formula | A = `this_week_opened` (total), B = `notification_opened` (total). Formula `A / (A + B)`. Go ≥ 25%. |
| **Catch taste** | Trends, unique users | `catch_succeeded` unique users ÷ `session_start` unique users, same period. Go ≥ 40%. |

**Notification sends** come from the database, because the server sends pushes and PostHog
never sees them. Supabase → SQL editor:

```sql
select date_trunc('day', sent_at) as day, count(*) as sends
from public.notification_log
group by 1 order by 1;
```

`notification_log` is kept ~30 days (retention, T-068), so check it during the test run, not
long after.
