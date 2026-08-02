# Nearby — Google Play listing & App content (draft)

> **DRAFT (T-097).** Copy + form answers Claude can prepare; the Director enters them in Play
> Console and supplies the graphic assets. Answers reflect the app **as built for the first
> internal-testing build** (prototype loop; **in-app purchases not yet enabled**). Revisit the
> Data safety + "Ads" answers if IAP/analytics scope changes before production.

## Store listing (text)
- **App name:** `Nearby` — ⚠️ generic; run a **trademark/name-collision check** (there are other
  "Nearby" apps and a Google "Nearby" feature) before production. If it needs changing, do it
  before the first upload.
- **Short description** (≤80 chars):
  `A living almanac of the wildlife active around you this season.`
- **Full description** (≤4000 chars):

  ```
  Nearby is a calm, honest almanac of the wild things that share your patch of the world.

  Each season, discover the birds, mammals, insects, fish, plants and fungi that are genuinely
  active in your region — never "here right now", always the true season. No pressure, no feeds
  to doom-scroll, no ads. Just a quiet nudge now and then when something worth noticing is around.

  • Spotted — build your regional almanac as species come into season.
  • Caught — when you want more, head out and land a species with a quick, one-thumb skill game
    tuned to how you'd actually find it: time a bird's dive, reel in a fish, trace an insect's
    flight, creep up on a mammal, or frame a plant.
  • Helped — one-tap, honor-system ways to give back and protect, with the reason it matters.

  Nearby is built to respect you: the mission content is always free, there are no ads anywhere,
  and your location is used once to set your home region and then discarded — we never keep a
  trail of where you are. Export or delete your data anytime from Settings.

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
| **Approximate location** | Yes | No | App functionality | Yes (consent) | Resolved once to a region, then coordinates discarded; coarse cell only. |
| **Email address** | Yes | No | Account management | Yes | Only if the user links an email to persist their account. |
| **User IDs** | Yes | No | App functionality, Analytics | Yes | Anonymous account id; app-generated analytics id (PostHog, EU, IP-anonymized). |
| **App interactions / in-app actions** | Yes | No | Analytics | Yes (consent) | Only when analytics consent is granted. |
| **Purchase history** | Not in this build | No | App functionality | — | Enable when IAP ships (handled by Google Play / RevenueCat). |

**Security practices:**
- Data **encrypted in transit**: Yes.
- Users can **request data deletion**: Yes — in-app "Delete account & data" (plus export).
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
