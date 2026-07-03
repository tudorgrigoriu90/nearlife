# Nearby — Economy Design Document

> How the app makes money and how progression value flows. Mechanics → [GDD.md](GDD.md).
> Implementation (RevenueCat, ad SDK) → [TSD.md](TSD.md).

---

## Model: one-time premium + DLC. **No subscription.**

This audience (nature-lovers, parents) has the worst subscription fatigue. A one-time "buy
the game" model fits the wholesome, trust-first tone and converts better here than a
subscription. **No gacha / pay-to-collect / energy timers / dark patterns.**

### Hard rule: never paywall the mission
Core facts and **all help/protect (conservation) content** stay **free for every species,
forever.** Locking "how not to harm this frog" behind a purchase betrays the app's purpose
and is a PR grenade. The mission content is the soul and the best marketing.

---

## The SKU ladder

| SKU | Price (one-time) | What it gives |
|-----|------------------|---------------|
| **Free** | — (ad-supported) | Home region, Spotted, all core facts + **all help/protect content**; depth tiers climbable by *playing* |
| **Full Game** | **$9.99** | Caught + Helped, **no ads**, full home region, **all depth tiers unlocked immediately** |
| **Family** | **$19.99** | Full Game for the household + **shared almanac / Caught / Helped / impact** |
| **Region pack** | **$2.99 each** | Collect another region's wildlife |
| **World Pass** | **$19.99** | All current + future regions |

- **Full Game — the workhorse.** Anchor **$9.99** (signals a real, crafted app; still an
  impulse buy). Drop to **$6.99–$7.99** for volume; don't exceed ~$12.99 for a one-time base.
  Occasional **$6.99** promos tied to seasonal events.
- **Family — the strongest SKU.** Shared almanac + shared Caught/Helped turns the household
  into a *team*: a kid's robin appears in the family almanac; any member's catch/help counts
  for all; shared family-impact number. Price ~2× single, framed "whole family for the price
  of two." Merchandise it hard.
- **Regions / World Pass — the DLC.** With no subscription, these are ongoing revenue; new
  seasonal/regional content drives repeat purchase.

---

## Monetization budget: two levers, not five

A wholesome app can carry ~2 distinct "pay me" signals before it reads as a cash grab and
erodes the trust that is its whole appeal. The free user should see exactly two: **"ads are
here"** and **"there's a fuller version."**

- **Depth tiers are included/earnable content, NOT separate purchases.** They exist (5 levels
  of trivia/lore/audio/deep-dives) but are climbable by playing for free users and unlocked by
  the Full Game purchase for payers. This makes them a *progression* mechanic, not a paywall,
  and avoids stacking per-tier IAPs on top of ad-removal + Caught/Helped.
- **Why also higher-revenue:** on a low-daily-use app, micro-IAP tiers underperform a single
  crisp unlock; people make one purchase decision, not five. Separate tier-IAPs add friction
  and support burden for marginal revenue while feeling grabbier.

---

## Ad model (free tier)

Ads exist mainly as a **gentle conversion nudge** toward the $9.99 unlock, not a revenue
engine (low daily-use caps ad income). Removing ads is the clearest reason to buy.

- **NOT per-collect / per-catch.** An ad on every collect destroys the ambient delight that is
  the app's whole differentiator; the earned catch moment must feel triumphant, not ad-gated.
- **Frequency-capped interstitials at natural breaks** — ~one per session, shown when
  *closing/leaving* a screen, never when opening a card.
- **Rewarded ads (opt-in)** — "watch to preview another region / unlock a bonus fact."
  Player-chosen, no resentment, higher eCPM. Preferred format.
- **Never ad the Helped/mission moment.** Tonally poisonous.
- **Kids & ads = regulated** (COPPA / GDPR-K / store kids-category). See
  [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md). Likely: child-safe/contextual networks only,
  or no ads for younger users with the paid Family plan as the clean ad-free path.

---

## Where growth actually comes from

Not from squeezing per-user ARPU (this audience won't tolerate it) but from:
- **Reach** — the concept is genuinely shareable and press-friendly; a mission-driven nature
  app gets featured/covered in ways a game never does. Keeps install cost low.
- **Loyalty** — the mission + family angle keep people for years.

Cheap installs × a clean $9.99/$19.99 decision × region expansions = a healthy, durable
business. It will never mint money like a combat game with whales — and that's fine; it's a
more resilient, defensible thing.

**Scale play (post-MVP, not a launch line):** conservation + tourism partnerships
(co-marketing, grants) — a channel that exists *only because* the app has a genuine purpose.

---

## Assumptions to validate (economy)
- Free→paid conversion for a casual wholesome app: assume **low single-digit %**. Model
  revenue as installs × conversion × blended ARPU; sensitivity-test at 1%, 3%, 5%.
- Family SKU attach rate among converting households (hypothesis: highest-LTV cohort).
- Region-pack repeat-purchase rate as the subscription replacement.
