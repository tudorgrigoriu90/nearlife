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
   kids-category rules** apply. (The decision to ship **no ads at all** — see §4 — removes
   the sharpest of these constraints; what remains is data-minimization for minors.)

---

## 1. Location data (GDPR sensitive)
- **Principle: collect the minimum, at the coarsest useful granularity.** The notification
  engine needs an **H3 cell**, not precise GPS coordinates.
- **Decisions:**
  - **Hometown derivation:** at onboarding, device location is resolved **once** to a
    region/province (`home_region_id`); the coordinates used are discarded immediately —
    only the region id is stored.
  - Store location at **cell resolution**, not raw lat/long history.
  - Prefer **on-device → send cell only**; do not retain precise-coordinate trails.
  - Request **"while in use"** permission, never background-always unless a feature truly needs
    it (MVP does not).
  - Clear purpose string: "to tell you what wildlife is active around you."
- **Lawful basis:** consent (explicit, granular) for location + notifications.

## 2. GDPR baseline (EU launch)
- **Consent:** granular opt-in for location, notifications, analytics — no pre-ticked boxes.
  (No ad consent needed — no ads exist.)
- **Rights:** data access, export, and **deletion** ("delete my account & data") must be
  build-time features, not manual ops.
- **Data minimization + retention policy:** define how long collection/location/analytics data
  is kept; auto-expire what isn't needed.
- **Records & transparency:** clear privacy policy; DPA with processors (Supabase, RevenueCat,
  PostHog). **Verify EU data residency / SCCs** for each processor.
- **Analytics:** use privacy-respecting config (PostHog can be EU-hosted / IP-anonymized).

## 3. Children & families (the sharpest constraint)
- **COPPA (US):** no collection of personal data from under-13 without verifiable parental
  consent; strict limits on behavioral ads.
- **GDPR-K (EU):** parental consent for minors (age threshold 13–16 by member state; Sweden 13).
- **App-store kids rules:** apps in kids categories face extra restrictions on ads, data, and
  external links.
- **Decision:** position as **general-audience "for the whole family"**, not a *kids-category*
  app. With **no ads in the product at all** (§4), the sharpest COPPA/GDPR-K exposure is gone;
  what remains is minimal-data handling for minors — the age-gate routes under-threshold users
  to a restricted, minimal-data path.
- A dedicated kids mode and the **Family plan are post-validation (v2)** — see
  [ECONOMY.md](ECONOMY.md). When Family ships, parental-consent flows must be designed then.

## 4. Ads — removed from the product (decision, not deferral)
- **Nearby ships with no ads and no ad SDK, permanently.** Rationale in
  [ECONOMY.md](ECONOMY.md): negligible revenue at this session frequency, the largest
  compliance surface in the product, and brand damage to the positioning that *is* the
  marketing.
- **Consequences:** no ad consent step, no ad-network DPA, no non-personalized-ads machinery,
  no ad-related COPPA/GDPR-K exposure, no ads settings surface.
- If ads are ever reconsidered, treat it as a major compliance project (contextual
  non-personalized only, frequency caps, minor suppression, SDK audit) — not a toggle.

---

## Architecture implications (fold into TSD now)
- Location stored **cell-level only**; no precise-coordinate history.
- Account/data **deletion + export** endpoints from day one.
- Consent state as first-class user data; gate features on it.
- Processor list with signed DPAs + EU residency verified.
- **No ad SDK in the build** — ad-related consent and settings surfaces do not exist.

## Decision summary

| Area | MVP decision |
|------|--------------|
| Location | Cell-level only, "while in use", explicit consent |
| GDPR rights | Delete/export built-in from day one |
| Audience | General-audience "for families", not kids-category (MVP); Family SKU v2 |
| Ads | **None — no ad SDK shipped** (permanent decision; see ECONOMY.md) |
| Processors | Supabase/RevenueCat/PostHog with DPAs + EU residency verified |

## Open actions
- [ ] Legal review of the above before public launch.
- [ ] Draft privacy policy + in-app consent flow.
- [ ] Confirm EU data residency for Supabase project + all processors.
- [x] Ads decision: **none, permanently** — no ad SDK ships (resolved; see ECONOMY.md).
- [ ] Confirm Sweden's GDPR-K digital-consent age (13) and onboarding age-gate design.
