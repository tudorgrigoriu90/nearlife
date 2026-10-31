# Nearby — Google Play listing & App content (draft)

> **DRAFT (T-097), updated 2026-10-31** for the v1 app as built: in-app purchases (Full Game,
> Family, county packs, All of Sweden), catch spots on a map, consent-gated analytics and crash
> reporting. The Director enters these in Play Console and supplies the graphics. The order to do
> everything in is [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## Store listing (text)
- **App name:** `Nearby` — ⚠️ generic; run a **trademark/name-collision check** (there are other
  "Nearby" apps and a Google "Nearby" feature) before production. If it needs changing, do it
  before the first upload.
- **Short description** (≤80 chars):
  `A living almanac of the wildlife active around you this season.`
- **Full description** (≤4000 chars):

  ```
  Nearby is a calm, honest almanac of the wild things that share your patch of the world.

  Each season, discover the birds, mammals, insects, fish, plants, spiders, snails, frogs and
  lizards that are genuinely active in your county: over 8,000 Swedish species, in your own
  language. Never "here right now", always the true season. No feeds to doom-scroll, no ads, no
  subscription. Just a quiet nudge now and then when something worth noticing is around.

  • Spotted: build your county almanac as species come into season.
  • Caught: head out to a nearby public place that suits the species (a lake for a pike, a
    meadow for a butterfly) and land it with a quick, one-thumb skill game.
  • Helped: one-tap, honour-system ways to give back and protect, with the reason it matters.

  Free to use, with 3 free catches every season. Unlock unlimited catching once with the Full
  Game, share it with up to 5 people with Family, and open other counties when you travel.
  Every species' facts and help-and-protect tips are always free.

  Nearby respects you: no ads anywhere, and your position never leaves your phone. We only keep
  your home county. Export or delete your data anytime from Settings.

  Get out, look closer, and get to know your neighbours.
  ```

- **Category:** Education (alt: Lifestyle). **Not** a kids/Family category — general audience.
- **Contact details:** support email **[support email]**, website **[url, optional]**.
- **Privacy policy URL:** the published URL from **T-095** (required).

## Graphic assets (Director / design supplies)
- [ ] **App icon** — 512×512 PNG (have `assets/icon.png`; export at 512²).
- [ ] **Feature graphic** — 1024×500 PNG/JPG (**required**, none exists yet).
- [ ] **Phone screenshots** — 2–8, 16:9 or 9:16, min 320px (need a running build — depends on T-141).
- [ ] (Optional) tablet screenshots, promo video.

## Data safety form (answers)
**Does the app collect or share user data?** Yes, collect. **Share (to third parties)?** No.
All collection is optional (consent-gated) and used for app functionality/analytics — **not** for
tracking or advertising.

| Data type | Collected | Shared | Purpose | Optional | Notes |
|-----------|-----------|--------|---------|----------|-------|
| **Approximate location** | Yes | No | App functionality | Yes (consent) | Only the home **county** is stored; the fix is resolved to it on the phone and discarded. |
| **Email address** | Yes | No | Account management | Yes | Only if the user links an email to persist their account. |
| **User IDs** | Yes | No | App functionality, Analytics | Yes | Anonymous account id; app-generated analytics id (PostHog, EU, IP-anonymized). |
| **App interactions / in-app actions** | Yes | No | Analytics | Yes (consent) | Only when analytics consent is granted. |
| **Purchase history** | Yes | No | App functionality | No (needed to unlock purchases) | What was bought and whether it is active, stored against the anonymous account (RevenueCat → our server). No card details. |
| **Crash logs** | Yes | No | App functionality (stability) | Yes (consent) | Sentry, only with analytics consent; no identity. |
| **Diagnostics** | Yes | No | App functionality (stability) | Yes (consent) | App version, phone model and OS in crash reports. |
| **Precise location** | **No** | No | — | — | Used on the phone only (catch-spot distance, travel notice) and never sent. Play counts data as "collected" only when it leaves the device. |

**Security practices:**
- Data **encrypted in transit**: Yes.
- Users can **request data deletion**: Yes — in-app "Delete account & data" (plus export).
- **Delete account URL** (required by Play): the published `delete-account` page (LAUNCH-CHECKLIST
  step 10). It explains the in-app path and what happens to an account without the app.
- Committed to Play **Families** policy: No (general-audience, not kids-category).
- Independent security review: No (declare honestly).

## Content rating questionnaire (IARC) — answers
- Violence / scary content / sexual content / profanity / controlled substances / gambling: **None**.
- The "catch" minigames are gentle, non-realistic skill games — no depicted violence.
- **User interaction / user-generated content / sharing:** **No** (v1 has no chat, feeds, or
  social sharing). ⚠️ Re-answer if a social layer (T-108) ships.
- Shares user location with other users: **No**.
- Expected outcome: **Everyone / PEGI 3**.

## Target audience & content
- **Target age:** **13 and older** (excludes under-13 to stay out of the Families/kids programme;
  matches the Sweden GDPR-K age-gate of 13). Do **not** select under-13 age bands.
- Appeals to children: keep visual style general-audience; do not opt into "Designed for Families".

## Ads
- **Contains ads: No.** (No ad SDK ships — invariant #3, permanent.)

## App access
- **All functionality is available without special access** — the app uses anonymous sign-in with
  no login wall, so no test credentials are needed for review.

## In-app products
- **Contains in-app purchases: Yes.** One-time products only (no subscription): Full Game, Family,
  21 county packs and All of Sweden ([PAYMENTS-SETUP.md](PAYMENTS-SETUP.md) Part E).

## Before production (personal developer accounts)
- Google requires a **closed test with at least 12 testers for 14 consecutive days** before the
  production release can be requested. Internal testing does not count towards it.
