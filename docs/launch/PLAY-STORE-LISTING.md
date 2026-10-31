# Nearby — Google Play listing & App content (draft)

> **DRAFT (T-097), updated 2026-10-31** for the v1 app as built: in-app purchases (Full Game,
> Family, county packs, All of Sweden), catch spots on a map, consent-gated analytics and crash
> reporting. The Director enters these in Play Console and supplies the graphics. The order to do
> everything in is [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## Store listing (text)
Enter Swedish as the **default language (sv-SE)**, then **Add translation → English (en-GB)**.
Play limits: name 30 characters, short description 80, full description 4,000. Paste the full
descriptions from [`store-assets/description-sv.txt`](store-assets/description-sv.txt) and
[`description-en.txt`](store-assets/description-en.txt): the copies below are wrapped for reading,
and Play would keep those line breaks.

- **App name:** `Nearby: Naturalmanacka` (sv) · `Nearby: Nature Almanac` (en). The suffix keeps
  the name findable and apart from other "Nearby" apps and Google's "Nearby" feature. ⚠️ Still
  run a quick trademark search on "Nearby" before production.
- **Short description:**
  - sv: `Upptäck djuren och växterna som är aktiva i ditt län den här säsongen.`
  - en: `Discover the wildlife and plants active in your county this season.`
- **Full description (sv):**

  ```
  Nearby är en lugn och ärlig almanacka över det vilda som delar din bit av världen.

  Varje säsong upptäcker du fåglarna, däggdjuren, insekterna, fiskarna, växterna, spindlarna,
  sniglarna, grodorna och ödlorna som verkligen är aktiva i ditt län: över 8 000 svenska arter,
  på ditt eget språk. Aldrig "här just nu", alltid den sanna säsongen. Inga flöden att fastna i,
  ingen reklam, ingen prenumeration. Bara en stilla påminnelse ibland när något värt att se är
  i farten.

  • Sett: bygg din läns-almanacka i takt med att arterna kommer in i säsong.
  • Fångat: gå till en allmän plats i närheten som passar arten (en sjö för en gädda, en äng för
    en fjäril) och fånga den i ett snabbt spel med en tumme.
  • Hjälpt: enkla sätt att ge tillbaka och skydda naturen, på hedersord, och varför det spelar
    roll.

  Gratis att använda, med 3 gratis fångster varje säsong. Lås upp obegränsat fångande en gång
  med Hela spelet, dela det med upp till 5 personer med Familj, och öppna andra län när du
  reser. Varje arts fakta och tips för att hjälpa och skydda är alltid gratis.

  Nearby respekterar dig: ingen reklam någonstans, och din position lämnar aldrig telefonen. Vi
  sparar bara ditt hemlän. Exportera eller radera dina data när du vill under Inställningar.

  Gå ut, titta närmare och lär känna dina grannar.
  ```

- **Full description (en):**

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

- **App category:** Education (alt: Lifestyle). **Not** a kids/Family category — general audience.
- **Tags** (Store settings → Manage tags): Nature, Education, Outdoor.
- **Contact details:** the privacy contact email from Step 10; website `https://nytta-ai.se`
  (optional).
- **Privacy policy URL:** the published URL from Step 10 (required).

## Graphic assets
Files are in [`store-assets/`](store-assets/); regenerate with `node scripts/store-assets/render.js`
and `node scripts/store-assets/feature.js`.
- [x] **App icon** 512×512: `store-assets/play-icon-512.png`. The same mark is the in-app icon
  (`assets/icon.png`, adaptive and themed Android icons), so store and phone match.
- [x] **Feature graphic** 1024×500: `store-assets/feature-graphic-sv.png` on the Swedish listing,
  `feature-graphic-en.png` on the English one.
- [ ] **Phone screenshots** 2–8, 9:16: taken from the real app (Play requires they show the app as
  it is). Planned: This Week, a species card, the Almanac, a catch-spot map, the catch game,
  Counties.
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
- **Is any part of your app restricted? Yes.** There is no sign-in (anonymous accounts), but paid
  one-time products and the Family invite code are on Google's list of restrictions, and
  reviewers can't buy.
- Sign-in details entry: **Name** `Reviewer access - no sign-in needed`; username and password
  empty; **Any other information**: how to open the free app, and (once built) the reviewer
  access code that unlocks the paid content. It must be in place before closed-test/production
  review.

## In-app products
- **Contains in-app purchases: Yes.** One-time products only (no subscription): Full Game, Family,
  21 county packs and All of Sweden ([PAYMENTS-SETUP.md](PAYMENTS-SETUP.md) Part E).

## Before production (personal developer accounts)
- Google requires a **closed test with at least 12 testers for 14 consecutive days** before the
  production release can be requested. Internal testing does not count towards it.
