# Nearby — Privacy Policy

> **DRAFT (T-095).** Drafted by Claude from [PRIVACY-COMPLIANCE.md](../PRIVACY-COMPLIANCE.md).
> The first draft was legally reviewed (T-009, 2026-10-31). **The sections marked 🆕 were added
> afterwards** (purchases, Family, travel, catch spots and the map, retention of customers) and go
> back to the reviewer before publication. Before it can be used as the Google Play privacy-policy
> URL, the Director must also fill the **[bracketed placeholders]** (controller identity + contact
> email) and publish it at a stable public URL (e.g. GitHub Pages). Effective date is set on
> publication.

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
- **Catch spots and the travel notice work on your phone.** Your position is compared with
  nearby places on the device and is never sent to us.
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
| 🆕 **Purchases** — Google Play handles the payment; our billing processor (RevenueCat) tells our server what you bought. We store, against your anonymous account id: the unlock (e.g. "Full Game", "Family", a county), the store product id, whether it is active, and when it last changed. We never see your name, email or card details from the store. | Unlock what you bought; restore it on a new device; end it if you are refunded. | Contract (Art. 6(1)(b)). |
| 🆕 **Family** — if you buy Family, we create a household with an **invite code**. When someone joins with the code, we store that their anonymous account belongs to your household and when it joined. No names, emails or contacts are involved, and the owner sees members only as "joined on <date>". | Share the Full Game with up to 5 people. | Contract (Art. 6(1)(b)). |
| 🆕 **Catch spots (position while catching)** — when you go to catch a species, the app downloads the public places in your county where it can be caught, and compares them with **one position fix on your phone**. The position is **not sent to us** and not stored, and neither is the spot: the catch itself records only the species and the time. | Check that you're at a real public place before a catch counts. | Consent (Art. 6(1)(a)) for location; contract for the catch. |
| 🆕 **Travel notice** — while the app is open and you have allowed location, the app notices on the phone when you are in another county and offers to show it. Only "county X was offered on date Y" is kept, **on your phone**, so the same offer isn't repeated. Nothing is sent to us. | Show what's active where you are travelling. | Consent (Art. 6(1)(a)). |

You can withdraw any consent at any time in **Settings**; withdrawing does not affect processing
already carried out.

## What we do **not** do
- No ads, no ad SDK, no ad tracking — permanently.
- No selling or sharing of your data with data brokers.
- No background/always location.
- No precise-coordinate history.
- 🆕 **No individual data in community numbers.** Totals like "this season, N people pledged M
  actions" are counts across everyone; no one's activity is shown to anyone else.

## Who processes data for us (sub-processors)
- **Supabase** — database, authentication, and backend (EU region).
- **PostHog** — product analytics (EU Cloud; IP anonymized; only with your consent).
- **RevenueCat** — in-app purchase/entitlement management (when purchases are enabled).
- **Google Play** — app distribution and payments.
- 🆕 **OpenFreeMap** — map tiles for the catch-spot map. Like any website, it receives your IP
  address and the map area you view. It receives no account id or other data from us. Map data
  © OpenStreetMap contributors.
- 🆕 **Google Firebase Cloud Messaging** — delivers the notifications you turned on, using the
  notification token.
- 🆕 **Sentry** — crash reports, **only if you allow analytics**. A report holds what is needed to
  fix the crash (where in the app it happened, app version, phone model and OS), never your
  account, IP address, location or screenshots. Kept 30 days by Sentry, then deleted.

We put a Data Processing Agreement in place with each processor and verify EU data residency or
appropriate safeguards (Standard Contractual Clauses) for any transfer outside the EU/EEA.

## How long we keep it
- **Runtime location signals:** not stored on our servers. At most ~30 days, as a coarse grid
  cell, if a future feature needs one.
- **Anonymous accounts with no activity:** deleted automatically after ~90 days without use,
  together with everything linked to them (collection, home region, notification settings).
  "Use" means opening the app, so a single launch in that time keeps the account. Accounts with a
  linked email are never expired. Only you can delete those, from Settings.
- 🆕 **Accounts holding a purchase** are not expired for inactivity, because deleting them would
  delete what you paid for (and, for a Family owner, every member's unlock). They are kept until
  you delete the account.
- 🆕 **Purchase records:** for as long as the account exists. When you delete it, the purchase
  records in our database are deleted with it. Google Play and RevenueCat keep their own
  transaction records as their law and terms require. Deleting your account does not cancel a
  purchase or trigger a refund, so you can restore the purchase into a new account.
- 🆕 **Family:** a member's link to a household lasts until they leave, are removed, or delete
  their account. If the owner deletes their account, the household and its unlock end for
  everyone in it.
- **Notification history** (which species we sent you, used to limit how often we notify):
  ~30 days.
- **Analytics:** ~365 days.
- **Your collection:** until you delete your account or the account expires as above.

## Your rights
Under the GDPR you can **access**, **export**, **correct**, **delete**, and **restrict** your data,
and **withdraw consent**. The app provides **"Export my data"** and **"Delete account & data"**
directly in Settings. 🆕 The export holds everything we keep for your account: home region,
consent choices, collection, purchase records and, if you're in a Family, your role and dates. An
owner's export shows when members joined, not who they are. You also have the right to lodge a complaint with your supervisory authority
— in Sweden, the **Integritetsskyddsmyndigheten (IMY)**.

## Children and families
Nearby is a **general-audience** app ("for the whole family"), not a children's-category app. In
Sweden the age of digital consent is **13**. Users under that age are routed to a **restricted,
minimal-data path**. Because the app carries no ads, there is no ad-related data collection from
anyone, minors included.

🆕 **Family households.** Joining a parent's Family with an invite code adds no personal data. The
child's account is anonymous like everyone's, and the age rules above apply to each member on their
own device. The owner cannot see a member's collection. Everyone keeps their own almanac.

## International transfers
We prefer EU-resident processing. Where a processor transfers data outside the EU/EEA, we rely on
adequacy decisions or Standard Contractual Clauses.

## Changes to this policy
We'll update this page and the "Last updated" date when this policy changes; material changes will
be surfaced in the app.

## Contact
**[privacy contact email]** — or write to **[postal address, if required]**.
