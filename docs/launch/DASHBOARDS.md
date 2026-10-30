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

---

## 2. Production (T-099): retention, sales, notifications

One dashboard called **Nearby: production**.

### Retention

**Events used:** `session_start`

| Insight | Type | Set-up |
|---|---|---|
| **Weekly retention** | Retention | Start `session_start` · Return `session_start` · Period **Week** · 8 periods. The app is seasonal, so expect a winter dip; compare the same week year on year. |
| **Active people** | Trends, unique users | `session_start` · unique users · by **Week** (also **Month**). |

### Sales: "out of free catches" to a purchase

The same steps `salesFunnel()` (`lib/salesFunnel.ts`) counts. Only Full Game and Family lift
the catch limit, so the funnel filters on those two products.

**Events used:** `free_catches_exhausted`, `paywall_shown`, `store_opened`, `purchase_started`,
`purchase_completed`, `purchase_cancelled`, `purchase_failed`

| Insight | Type | Set-up |
|---|---|---|
| **Catch-limit funnel** (the key number, ECONOMY.md) | Funnel | `free_catches_exhausted` → `store_opened` where `source` = `paywall` → `purchase_started` where `sku` is `full_game` or `family` → `purchase_completed` where `sku` is `full_game` or `family`. Window **1 day**. |
| **Purchases by product** | Trends | `purchase_completed` · total · broken down by `sku`. County packs show as `region_swe_<n>`, All of Sweden as `all_regions`. |
| **Where people open the store** | Trends | `store_opened` · total · broken down by `source` (paywall, settings, counties, catch_spot). |
| **Purchases that don't finish** | Trends | `purchase_cancelled` and `purchase_failed` · total · by **Day**. A rise in `purchase_failed` usually means a Play / RevenueCat setup problem, not a change of heart. |

Revenue itself comes from RevenueCat (**Charts → Revenue**) and Play Console, not PostHog: the app
never sends prices.

### Notifications and pull

**Events used:** `notification_opened`, `this_week_opened`, `species_spotted`, `identify_opened`

| Insight | Type | Set-up |
|---|---|---|
| **Notification opens** | Trends | `notification_opened` · total · by **Day**. Open rate = this ÷ sends from `notification_log` (SQL in §1). |
| **How people find species** | Trends | `species_spotted` · total · broken down by `source` (notification, this_week, onboarding). |
| **Organic pull** | Trends, formula | A = `this_week_opened`, B = `notification_opened`; `A / (A + B)`. |
| **Demand for identification** | Trends | `identify_opened` · unique users · by **Week**. This is the evidence for building on-phone identification (T-222). |
