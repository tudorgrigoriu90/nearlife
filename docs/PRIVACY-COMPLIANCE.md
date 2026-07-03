# Nearby — Privacy & Compliance (GO / NO-GO)

> **Purpose:** surface the legal constraints that shape architecture *before* building —
> location handling, GDPR, children, and ads. Getting these wrong forces a redesign or blocks
> store approval. **Status:** Draft — requires legal review before launch.

---

## Why this is gating
Three facts about this product make compliance load-bearing, not optional:
1. **Launch region is the EU (Sweden)** → **GDPR applies** in full.
2. **The app uses location** → location is sensitive personal data.
3. **The audience includes children/families** → **COPPA (US), GDPR-K (EU), and app-store
   kids-category rules** apply, and they heavily restrict ads and data collection.

---

## 1. Location data (GDPR sensitive)
- **Principle: collect the minimum, at the coarsest useful granularity.** The notification
  engine needs an **H3 cell**, not precise GPS coordinates.
- **Decisions:**
  - Store location at **cell resolution**, not raw lat/long history.
  - Prefer **on-device → send cell only**; do not retain precise-coordinate trails.
  - Request **"while in use"** permission, never background-always unless a feature truly needs
    it (MVP does not).
  - Clear purpose string: "to tell you what wildlife is active around you."
- **Lawful basis:** consent (explicit, granular) for location + notifications.

## 2. GDPR baseline (EU launch)
- **Consent:** granular opt-in for location, notifications, analytics, ads — no pre-ticked boxes.
- **Rights:** data access, export, and **deletion** ("delete my account & data") must be
  build-time features, not manual ops.
- **Data minimization + retention policy:** define how long collection/location/analytics data
  is kept; auto-expire what isn't needed.
- **Records & transparency:** clear privacy policy; DPA with processors (Supabase, RevenueCat,
  PostHog, ad network). **Verify EU data residency / SCCs** for each processor.
- **Analytics:** use privacy-respecting config (PostHog can be EU-hosted / IP-anonymized).

## 3. Children & families (the sharpest constraint)
- **COPPA (US):** no collection of personal data from under-13 without verifiable parental
  consent; strict limits on behavioral ads.
- **GDPR-K (EU):** parental consent for minors (age threshold 13–16 by member state; Sweden 13).
- **App-store kids rules:** apps in kids categories face extra restrictions on ads, data, and
  external links.
- **Decision options:**
  - (a) Position as **general-audience "for the whole family"**, not a *kids-category* app,
    with the **paid Family plan as the ad-free, low-data path** for households with children; or
  - (b) If a kids-category tier is wanted later, it must be **ads-off + minimal-data** by design.
- **MVP recommendation:** ship general-audience; **no behavioral ads**; Family plan is the
  clean child path. Revisit a dedicated kids mode post-validation.

## 4. Ads & compliance
- Behavioral/targeted ads to children are effectively off the table (COPPA/GDPR-K).
- If ads ship: **contextual, non-personalized only**, frequency-capped, and **suppressed for
  users flagged as minors / in Family households**.
- Ad SDK choice must support **non-personalized / child-directed** modes (AdMob supports this)
  — but strongly consider **holding ads until post-MVP** to keep the compliance surface small
  during validation.

---

## Architecture implications (fold into TSD now)
- Location stored **cell-level only**; no precise-coordinate history.
- Account/data **deletion + export** endpoints from day one.
- Consent state as first-class user data; gate features on it.
- Processor list with signed DPAs + EU residency verified.
- Ads behind a flag, defaulting **off** for minors/Family and **non-personalized** otherwise.

## Decision summary

| Area | MVP decision |
|------|--------------|
| Location | Cell-level only, "while in use", explicit consent |
| GDPR rights | Delete/export built-in from day one |
| Audience | General-audience "for families", not kids-category (MVP) |
| Ads | Non-personalized only; off for minors/Family; consider deferring entirely |
| Processors | Supabase/RevenueCat/PostHog with DPAs + EU residency verified |

## Open actions
- [ ] Legal review of the above before public launch.
- [ ] Draft privacy policy + in-app consent flow.
- [ ] Confirm EU data residency for Supabase project + all processors.
- [ ] Decide ads on/off for MVP (recommendation: off).
- [ ] Confirm Sweden's GDPR-K digital-consent age (13) and onboarding age-gate design.
