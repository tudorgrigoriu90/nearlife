# Nearby — Economy Design Document

> How the app makes money and how progression value flows. Mechanics → [GDD.md](GDD.md).
> Implementation (RevenueCat) → [TSD.md](TSD.md).

---

## Model: one-time premium. **No subscription. No ads.**

This audience (nature-lovers, parents) has the worst subscription fatigue. A one-time "buy
the game" model fits the wholesome, trust-first tone and converts better here than a
subscription. **No gacha / pay-to-collect / energy timers / dark patterns — and no ads,
ever (decision below).**

### Hard rule: never paywall the mission
Core facts and **all help/protect (conservation) content** stay **free for every species,
forever.** Locking "how not to harm this frog" behind a purchase betrays the app's purpose
and is a PR grenade. The mission content is the soul and the best marketing.

---

## Give away the taste, sell the meal

The catch loop is the fun the Full Game sells. Premium conversion works when people pay for
**more of something they already love** — not to find out whether an experience they've never
had is fun. So:

- **Free users get 3 catches per season.** Enough to feel the full loop — travel to the
  habitat, play the category minigame, earn the reward, get the contextual protect tip —
  not enough to satisfy a collector.
- The purchase pitch becomes *"you loved catching — get unlimited,"* instead of *"pay $4.99
  to find out if the game part is any good."*
- Side benefit: the validation prototype can test all three tiers with free users, not just
  the passive one.

---

## The SKU ladder

### MVP (v1) — Full Game and Family

| SKU | Price (one-time) | What it gives |
|-----|------------------|---------------|
| **Free** | — | **Home region** (hometown GPS-derived at signup — locked; see below) · Spotted · "Active this week" · all core facts + **all help/protect content** · Helped pledges · depth tiers climbable by *playing* · **3 catches per season** |
| **Full Game** | **$4.99** (49 SEK) | **Unlimited catching** · all depth tiers unlocked immediately · full home region |
| **Family** | **$9.99** (99 SEK) | The Full Game for **up to 5 people**: the buyer shares an invite code and each member gets the Full Game on their own phone. Everyone keeps their own collection. |

- **Price: $4.99 / 49 SEK (Director, 2026-10-29)**, down from the original $9.99 anchor. The
  reasoning is that 49 SEK is a very common app price point in Sweden and an easier impulse buy for
  this audience. The trade-off is recorded so it can be judged with data: at the same conversion,
  revenue halves (at 50k installs × 3%: ~$6.3k instead of ~$12.7k after the store's 15%), so the
  lower price pays off only if it **more than doubles** conversion. Prices live in the store
  consoles, not in the app (the app shows the store's localized price), so testing 79 SEK later is a
  console change, not a release. Occasional seasonal promos stay possible.
- **Family in v1 (Director, 2026-10-29).** It was cut from v1 until single-player conversion was
  proven; the Director brought it forward because parents are the core audience. It is priced at
  2× the Full Game, as the original plan had it, and covers up to 5 people.
  - v1 ships the **shared unlock only**. The buyer gets an invite code; each member joins from
    their own phone and gets the Full Game.
  - Google Play does not share one-time in-app purchases with a family group, so the household
    is ours: membership lives in Supabase, and the server grants the entitlement.
  - Joining a household adds no personal data. Members are the same anonymous accounts, linked by
    a code.
- **Region packs in v1 (Director, 2026-10-29).** v1 is Sweden only, so a region pack opens
  another **county**, and the World Pass becomes an **all-of-Sweden** pass. **Prices (Director,
  2026-10-30): 29 SEK per county, 99 SEK for all of Sweden.** These replace the $2.99 / $19.99
  figures in the table below, which predate the 49 SEK anchor. All of Sweden costs the same as
  Family, and buying it is cheaper than opening four counties one by one.
  - **Packs open places, not catches (2026-10-30).** A county pack or All of Sweden decides
    *where* you can spot and catch. The Full Game (or Family) decides *how many* catches you get.
    They are separate products, and none includes another. The Counties screen says so in one
    line (`counties.catchesNote`), hidden once the user has the Full Game. That way nobody buys
    All of Sweden expecting unlimited catches. Bundling All of Sweden with the Full Game was the
    rejected alternative. At 99 SEK it would undercut Family (99 SEK for five people) and make
    the 49 SEK anchor look like a bad deal.

### Post-validation (v2+)

| SKU | Price | Notes |
|-----|-------|-------|
| **Family, shared almanac** | (included in Family) | The v2 half of Family: a **shared almanac / Caught / Helped / impact** for the household, so it plays as a team. This is the complex part (shared collection model, member activity), which is why v1 ships the shared unlock alone. |
| **Region pack** | $2.99 | See "Regions are growth spend, not DLC revenue" below. |
| **World Pass** | $19.99 | All current + future regions. |

---

## Exactly one "pay me" signal

A wholesome app can carry very few monetization signals before it reads as a cash grab and
erodes the trust that is its whole appeal. With ads gone, the free user sees **exactly one**:
*"there's a fuller version."* The free-catch counter is that signal's natural delivery —
when the third seasonal catch is spent, the Store is the obvious next step. No other nag
surface exists.

- **Depth tiers are included/earnable content, NOT separate purchases.** They exist (5 levels
  of trivia/lore/audio/deep-dives) but are climbable by playing for free users and unlocked by
  the Full Game purchase for payers. A *progression* mechanic, not a paywall.
- **Why also higher-revenue:** on a low-daily-use app, micro-IAP tiers underperform a single
  crisp unlock; people make one purchase decision, not five. Separate tier-IAPs add friction
  and support burden for marginal revenue while feeling grabbier.

---

## No ads — a decision, not a deferral

Ads are permanently out of the product:

1. **The money isn't there.** A low-session-frequency wholesome app earns pennies from
   contextual, non-personalized ads — the only kind legally showable to a family audience.
2. **The compliance surface is enormous.** Serving ads to an audience that includes children
   drags in COPPA, GDPR-K, and store kids-category rules. Removing the ad SDK removes most
   of that exposure — see [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md).
3. **The brand is the marketing.** "Wholesome, honest, mission-first, no ads" is a sentence
   reviewers and press repeat verbatim. Ads would poison the positioning for lunch money.

The conversion nudge ads were meant to provide is replaced by the free-catch limit — a
cleaner funnel with zero tonal cost.

---

## Regions: home is freemium, everywhere else is a pack

- **Hometown is GPS-derived at signup** — the phone's location resolves to a country +
  region/province. **No manual picker:** you can't claim a hometown you're not standing in.
  The freemium experience (Spotted, This Week, 3 catches/season, the Full Game unlock) lives
  **in the home region only**.
- **Hometown is locked.** Freely switching it would be a free tour of the world and no pack
  would ever sell. Changeable only via a support request for genuine relocation.
- **Every other region is paid:** Region packs ($2.99) for travelers, expats, and
  collectors; World Pass ($19.99) for everything.
- **What a new region costs us — kept light by design:** the data side is automated
  (GBIF/OSM pipeline). The content side stays cheap because Helped advice is species-level,
  defaults to universally safe actions, and always highlights "follow local law" (rules in
  [GDD.md](GDD.md) §5) — so opening a region is a light editorial pass, not a heavy
  vetting project.
- **EU expansion adds a language cost.** Beyond Sweden, opening a country also means localizing
  species content into its language with **native review** (correctness- and law-sensitive give/
  protect advice cannot be raw machine-translated) — see [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).
  Photos and the data pipeline are language-independent, so the incremental cost per country is
  *translation + native review + local-law check* — still modeled as growth spend, justified by
  the new home market it opens.
- **How to choose the next region:** new home-market users (people who can set it as
  hometown and convert to Full Game) first; traveler pack demand second. Packs are real
  revenue, but each opened region's bigger prize is its home market.

---

## Where growth actually comes from

Not from squeezing per-user ARPU (this audience won't tolerate it) but from:
- **Reach** — the concept is genuinely shareable and press-friendly; a mission-driven nature
  app gets featured/covered in ways a game never does. Keeps install cost low.
- **Loyalty** — the mission (and, in v2, the family angle) keeps people for years.

Cheap installs × a clean $4.99 decision × region packs as travel revenue = a healthy,
durable business. It will never mint money like a combat game with whales — and that's fine;
it's a more resilient, defensible thing.

**Scale play (post-MVP, not a launch line):** conservation + tourism partnerships
(co-marketing, grants) — a channel that exists *only because* the app has a genuine purpose.

---

## Assumptions to validate (economy)
- Free→paid conversion for a casual wholesome app: assume **low single-digit %**. Model
  revenue as installs × conversion × ARPU; sensitivity-test at 1%, 3%, 5%.
- **The taste funnel — the single most important number:** of free users who spend all
  3 seasonal catches, what share buys Full Game? (And upstream: what share of free users
  ever uses a free catch at all?)
- Region economics: per-region cost (pipeline run + light content pass) vs. pack sales +
  new home-market users in that region.
- *(v2)* Family SKU attach rate among converting households (hypothesis: highest-LTV cohort).
