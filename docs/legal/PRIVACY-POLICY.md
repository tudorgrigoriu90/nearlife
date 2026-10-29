# Nearby — Privacy Policy

> **DRAFT (T-095).** Drafted by Claude from [PRIVACY-COMPLIANCE.md](../PRIVACY-COMPLIANCE.md).
> **Not yet legally reviewed (T-009) and not yet hosted.** Before it can be used as the Google
> Play privacy-policy URL, the Director must: (1) fill the **[bracketed placeholders]** (controller
> identity + contact email), (2) have it reviewed by the legal reviewer, and (3) publish it at a
> stable public URL (e.g. GitHub Pages). Effective date is set on publication.

**Last updated:** [date on publication] · **Effective:** [date on publication]

## Who we are
Nearby ("the app", "we") is a wildlife almanac for exploring the species active around you. The
data controller is **[legal entity or individual name, address]**. For any privacy question or to
exercise your rights, contact **[privacy contact email]**.

We are based in / operate the service from the EU, and the app launches in Sweden. This policy is
written to meet the EU General Data Protection Regulation (GDPR).

## The short version
- We collect the **minimum** needed to run the app.
- **We show no ads, ever, and we never sell your data.**
- **Location is resolved once to a region, then the exact coordinates are discarded.** We never
  keep a trail of where you are.
- Location, notifications, and analytics are each **opt-in** — off until you turn them on.
- You can **export** or **delete** your data at any time from Settings.

## What we collect, why, and our legal basis

| Data | Why | Legal basis (GDPR) |
|------|-----|--------------------|
| **Account identifier** — an anonymous account is created so your collection can persist. You may optionally link an **email** to keep it across reinstalls/devices. | Save your almanac progress. | Contract (Art. 6(1)(b)). |
| **Home region** — at onboarding, your device location is resolved **once** to a region/province (e.g. Kronoberg). **The coordinates are discarded immediately**; only the region is stored. | Show wildlife active in your area this season. | Consent (Art. 6(1)(a)). |
| **Approximate location while using the app** — where a feature needs it, only a **coarse grid cell** is used, never precise coordinates, and only "while in use". | Tell you what wildlife is active around you. | Consent (Art. 6(1)(a)). |
| **Your collection** — which species you've spotted, caught, or pledged to help, with timestamps. | The core almanac feature. | Contract (Art. 6(1)(b)). |
| **Notification token** — only if you enable notifications. | Send the seasonal nudges you asked for. | Consent (Art. 6(1)(a)). |
| **Product analytics** — only if you consent: app events (e.g. screen opened, species spotted) with an anonymous id. **No precise location, no contact details.** Collected via PostHog with **EU hosting and IP anonymization**. | Understand what's useful and improve the app. | Consent (Art. 6(1)(a)). |
| **Purchases** — if/when in-app purchases are offered, the app store and our billing processor handle the transaction and tell us only your entitlement (e.g. "Full Game unlocked"). We never see your card details. | Unlock purchased features; restore across devices. | Contract (Art. 6(1)(b)). |

You can withdraw any consent at any time in **Settings**; withdrawing does not affect processing
already carried out.

## What we do **not** do
- No ads, no ad SDK, no ad tracking — permanently.
- No selling or sharing of your data with data brokers.
- No background/always location.
- No precise-coordinate history.

## Who processes data for us (sub-processors)
- **Supabase** — database, authentication, and backend (EU region).
- **PostHog** — product analytics (EU Cloud; IP anonymized; only with your consent).
- **RevenueCat** — in-app purchase/entitlement management (when purchases are enabled).
- **Google Play** — app distribution and payments.

We put a Data Processing Agreement in place with each processor and verify EU data residency or
appropriate safeguards (Standard Contractual Clauses) for any transfer outside the EU/EEA.

## How long we keep it
- **Runtime location signals:** not stored on our servers. At most ~30 days, as a coarse grid
  cell, if a future feature needs one.
- **Anonymous accounts with no activity:** deleted automatically after ~90 days without use,
  together with everything linked to them (collection, home region, notification settings).
  "Use" means opening the app, so a single launch in that time keeps the account. Accounts with a
  linked email are never expired. Only you can delete those, from Settings.
- **Notification history** (which species we sent you, used to limit how often we notify):
  ~30 days.
- **Analytics:** ~365 days.
- **Your collection:** until you delete your account or the account expires as above.

## Your rights
Under the GDPR you can **access**, **export**, **correct**, **delete**, and **restrict** your data,
and **withdraw consent**. The app provides **"Export my data"** and **"Delete account & data"**
directly in Settings. You also have the right to lodge a complaint with your supervisory authority
— in Sweden, the **Integritetsskyddsmyndigheten (IMY)**.

## Children and families
Nearby is a **general-audience** app ("for the whole family"), not a children's-category app. In
Sweden the age of digital consent is **13**. Users under that age are routed to a **restricted,
minimal-data path**. Because the app carries no ads, there is no ad-related data collection from
anyone, minors included. A dedicated Family experience with parental-consent flows is planned for a
future version and will be designed to the applicable rules at that time.

## International transfers
We prefer EU-resident processing. Where a processor transfers data outside the EU/EEA, we rely on
adequacy decisions or Standard Contractual Clauses.

## Changes to this policy
We'll update this page and the "Last updated" date when this policy changes; material changes will
be surfaced in the app.

## Contact
**[privacy contact email]** — or write to **[postal address, if required]**.
