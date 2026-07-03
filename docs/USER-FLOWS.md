# Nearby — User Flows & Wireframes

> Screen inventory, wireframe-level specs, and key journeys. Mechanics → [GDD.md](GDD.md);
> implementation → [TSD.md](TSD.md); compliance copy → [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md).
> Wireframes are text sketches (portrait phone, ~single column). Status: **draft v2**.

---

## Screen inventory (MVP / v1)
1. Onboarding (multi-step) · 2. Home / Almanac · 3. This Week · 4. Species Card ·
5. Notification → Card · 6. Catch flow (map + minigame) · 7. Help / Pledge · 8. Store ·
9. Settings

**Not in v1:** Family / household screens ship post-validation with the Family SKU
(see [ECONOMY.md](ECONOMY.md)). The design intent — shared almanac, member activity feed,
family impact counter — is preserved in GDD §8.

Legend: `[Button]` `(toggle)` `‹free›` `‹paid›` `{state}`

---

## 1. Onboarding (compliance-shaped, multi-step)

```
┌────────────────────────────┐
│         🌿 Nearby          │  Step 1 — Welcome
│                            │
│  Discover the wild life    │
│  that shares your world.   │
│  No hunting. No photos.    │
│                            │
│      [ Get started ]       │
│   Already have an account? │
└────────────────────────────┘
   → Step 2 Age-gate → Step 3 Location → Step 4 Notifications → Step 5 Consent → first Spotted demo
```

**Steps & rules**
- **2. Age-gate** (GDPR-K): "What's your birth year?" → under threshold (Sweden 13) routes to
  a restricted, minimal-data path. (The app has no ads for anyone — see ECONOMY — so the
  age-gate governs data handling only.)
- **3. Location permission**: pre-prompt explainer *before* the OS dialog — purpose string
  "to tell you what wildlife is active around you." Request **while-in-use** only. Location
  has a second job here: **hometown is derived from it** (see Finish). `[Allow]` `[Not now]`
  (declining → preview mode; hometown is set on first grant).
- **4. Notifications**: pre-prompt "This is how you discover species — one gentle ping when
  something's active nearby." `[Enable]` `[Maybe later]`. **Declining is fine long-term:**
  the This Week screen (§3) keeps the app alive without push.
- **5. Consent** (granular, no pre-ticked boxes): Location (needed) · Notifications ·
  Analytics (opt). `[Continue]`.
- **Finish**: **hometown is GPS-derived** — the phone's location is resolved once to a coarse
  country + region/province and shown for confirmation: *"Your hometown: Kronoberg, Sweden.
  Your free experience is anchored here — it can't be changed later."* **No manual picker**
  (anti-abuse: you can't claim a hometown you're not standing in). Support-only change for
  genuine relocation (see [ECONOMY.md](ECONOMY.md)). The coordinates used are discarded —
  only the resolved region id is stored ([PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md)). →
  **immediate first Spotted demo** so the core payoff is felt in onboarding.

**States**: location denied → **preview mode** (browse demo cards; no almanac, no hometown
yet) with a gentle re-ask when the user tries to collect — hometown is set on first grant.
Existing account → login.

---

## 2. Home / Almanac (the collection = the home screen)

```
┌────────────────────────────┐
│ Kronoberg ▾             ⚙  │  region · settings
├────────────────────────────┤
│ Spotted 142 · Caught 38 ·  │  progress summary (3 tiers)
│ Helped 12                  │
│ 📅 Active this week (14) › │  → This Week screen
│ [Birds][Insects][Plants][…]│  category filter chips
│ ▸ Season: Summer  ▸ Habitat│  secondary filters
├────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐        │
│ │ 🐦 │ │ 🦋 │ │ 🌼 │  …     │  species grid; badge overlays:
│ │● ◐ ○│ │● ○ ○│ │● ◐ ◑│      │  ● Spotted ◐ Caught ◑ Helped
│ └────┘ └────┘ └────┘        │  greyed = not yet Spotted
│ ┌────┐ ┌────┐ ┌────┐        │
│ │ 🦔 │ │ 🐸 │ │ 🐝 │        │
│ └────┘ └────┘ └────┘        │
├────────────────────────────┤
│  🏅 Badges     🌍 Impact    │  bottom: achievements + collective impact
└────────────────────────────┘
```

**Components**: region switcher (locked regions show ‹paid› lock + link to Store — v2);
3-tier progress; **This Week entry point**; filters; species grid with tier-state overlays;
badges + collective-impact entry.
**States**: empty (new user → "Your almanac is waiting — check what's active this week");
loading skeletons.
**Interactions**: tap species → Card; tap "Active this week" → This Week; tap Impact →
community counters.

---

## 3. This Week (the pull surface — works without notifications)

```
┌────────────────────────────┐
│ ‹ back      This week 🌿    │
│ Kronoberg · early July      │
│ 14 species active near you  │
├────────────────────────────┤
│ 🐦 Common Swift   ● Spotted │
│    dusk, screaming parties  │
│ 🦋 Small Tortoiseshell {NEW}│
│    sunny nettle patches     │
│ 🌼 Oxeye Daisy    ● Spotted │
│    roadside meadows         │
│ 🦇 Common Pipistrelle {NEW} │
│    first bats after sunset  │
│ …                          │
├────────────────────────────┤
│ Updated weekly — from the   │
│ same seasonal data as your  │
│ notifications               │
└────────────────────────────┘
```

**Why it exists**: the app must never be notification-dependent. Users who decline or mute
push still have a reason to open Nearby — this screen is that reason, and the answer to
"what's the session when notifications are off?"
**Rules**: `{NEW}` = not yet Spotted → silhouette + name; tapping a NEW species opens its
Card and marks it ● Spotted (same frictionless collect as a notification tap). Same honesty
copy: "active in your area this season," never "here right now."
**Data**: plain query on the same `cell_species_month` table the notification engine uses
(TSD §4) — no extra pipeline.
**States**: quiet week ("A quiet week — winter is resting season here"); location off →
region-level list.

---

## 4. Species Card (the content surface)

```
┌────────────────────────────┐
│ ‹ back            ♥ share   │
│      [ hero image ]         │
│  Common Swift               │
│  Apus apus · Bird · Common  │
│  ● Spotted  ◐ Caught  ◑ Help│  tier state row
├────────────────────────────┤
│ FACT (Tier 1 · free)        │
│ Swifts can stay airborne    │
│ for months without landing. │
├────────────────────────────┤
│ 🕐 When & how to see it     │  always-free trivia
│ Dusk, high over rooftops;   │
│ listen for screaming parties│
├────────────────────────────┤
│ Depth ▸ ①②③④⑤  {2/5}       │  depth tiers: filled=unlocked
│  climb by playing / unlock  │  ‹free earns› ‹paid all›
├────────────────────────────┤
│ 🌱 Help it thrive (GIVE)    │  ALWAYS FREE
│ Put up a swift box under    │
│ your eaves.     [ Pledge ]  │
├────────────────────────────┤
│ 🛡 Don't harm it (PROTECT)  │  ALWAYS FREE
│ Nest sites are lost in      │
│ renovations — keep eaves    │
│ gaps.           [ Pledge ]  │
├────────────────────────────┤
│      [ 📍 Find it nearby ]  │  → Catch flow
│   ‹3 free/season · unlimited│
│    with Full Game›          │
└────────────────────────────┘
```

**Free vs paid**: fact (Tier 1), when/how, and **both give & protect actions are always
free**. Depth tiers 2–5 unlock by play or purchase. "Find it nearby" (Caught) is free for
**3 catches per season**; unlimited with ‹Full Game›.
**States**: not-yet-Spotted (silhouette + "not in your almanac yet"); out of free catches
(→ Store, gentle); already caught/helped (checkmarks, timestamps, prime-bonus badge).
**Copy rule**: never "here right now" — "active in your region this season."

---

## 5. Notification → Card (the core loop)

```
[Push] "A Common Swift is active in your area this season 🐦"
   │ tap
   ▼
[Species Card] opens → auto-marked ● Spotted → toast "Added to your almanac (+1)"
```
Frictionless: viewing needs no login; an account persists collection across devices.
Never interrupt the delight moment with anything — no upsell, no interstitial of any kind.

---

## 6. Catch flow (map → minigame → Caught) — 3 free per season · unlimited ‹Full Game›

```
Step A — Map of habitat catch spots        Step B — Category minigame
┌────────────────────────────┐            ┌────────────────────────────┐
│ ‹ back   Find: Swift        │            │   [ animated scene ]        │
│ Free catches left: 2 🎟     │            │  Tap when the swift dives!  │
│ ┌────────────────────────┐  │            │      ◍ timing ring          │
│ │  MapLibre map          │  │            │                            │
│ │   ◉ you                │  │            │   {success → Caught}        │
│ │   📍 habitat spot(s)   │  │            └────────────────────────────┘
│ │   (public land only)   │  │                     │ success
│ └────────────────────────┘  │                     ▼
│ "Swifts feed over open      │            ┌────────────────────────────┐
│  water & rooftops nearby"   │            │  ◐ Caught!  (+ prime bonus  │
│      [ I'm here — catch ]   │            │  ⭐ if in active window)     │
└────────────────────────────┘            │  🛡 Contextual protect tip:  │
   proximity-gated                        │  "Nests on rooftops here —  │
                                          │   avoid blocking eaves gaps"│
                                          │        [ Nice ]             │
                                          └────────────────────────────┘
```

**Minigame varies by species category** (one style each — design in GDD §4):

| Category | Minigame style |
|----------|----------------|
| Bird | **Timing** — tap the moment it dives / sings / takes off |
| Fish | **Rhythm & tension** — reel-style; keep the line in the sweet zone |
| Insect | **Trace** — follow the flight path without breaking the line |
| Mammal | **Stealth** — advance slowly; freeze when it looks up |
| Plant / fungus | **Spot & frame** — find it in the scene and frame it well |

**Rules**: spots are **habitat-derived (OSM), public-land only**, with hard safety exclusions
(private/road/water/reserve) — see TSD §5. Catch is proximity-gated. **Prime bonus** if within
the species' active window. **Contextual protect tip** fires here — the "killer moment."
**Free-catch counter** shown on the map screen; decrements on a successful catch only.
**States**: no spots nearby ("no swift habitat within reach — try near water"); too far
(`[Get closer]`); GPS off (prompt); **out of free catches** → gentle sheet: "You've used
your 3 free catches this season. Full Game makes it unlimited." `[See Full Game]` `[OK]`.

---

## 7. Help / Pledge (mission, honor system)

```
┌────────────────────────────┐
│ ‹ back   Help the Swift     │
│  Choose how you'll help:    │
│  ○ GIVE  Put up a swift box │
│  ○ PROTECT Keep eaves gaps  │
├────────────────────────────┤
│ Why it matters:             │  knowledge-first, never scolding
│ Swifts return to the same   │
│ nest yearly; renovations    │
│ erase them.                 │
│ ⚖ Always follow local rules │  standing line on every help card
│        [ I'll do this ]     │
└────────────────────────────┘
   │ pledge
   ▼
◑ Helped → "You + 4,231 others helped swifts this spring 🌍"  (collective impact)
```
No proof required (consistent no-proof ethos). Helped is **one tap + useful info**, never a
chore list: advice is species-level and universally safe by default, with the **"follow
local rules"** line always shown (GDD §5). No upsell on or after this moment — tonally
sacred. Feeds `impact_counters`.

---

## 8. Store (RevenueCat, no dark patterns)

```
┌────────────────────────────┐
│ ‹ back        Unlock Nearby │
│ ┌────────────────────────┐  │
│ │ Full Game      $9.99    │  │  unlimited catching · all depth
│ │ [ Unlock ]              │  │  tiers · full home region
│ └────────────────────────┘  │
│  You've felt the catch —    │
│  this makes it unlimited.   │
│                            │
│  Restore purchases          │
│  ✓ Help & protect content   │
│    is always free.          │  reassurance = mission integrity
│  ✓ No ads. Ever.            │
└────────────────────────────┘
```
One SKU, value stated plainly; "mission is free" + "no ads" reassurance shown. **No**
timers/urgency/dark patterns. *(Family, region packs, and World Pass are post-validation —
see [ECONOMY.md](ECONOMY.md); the store gains cards then.)*

---

## 9. Settings

```
┌────────────────────────────┐
│ ‹ back         Settings     │
│ Notifications               │
│   Cadence: ◑ gentle / daily │
│   Quiet hours: 22:00–07:00  │
│   (toggle) "Good time now"  │  opt-in prime-time nudges
│ Location: While in use ▾    │
│ Language: Svenska ▾         │  device locale by default; override here (i18n)
│ Privacy                     │
│   [ Export my data ]        │  GDPR — first-class
│   [ Delete account & data ] │
│ Attribution / About         │  GBIF · © OpenStreetMap · photo credits
└────────────────────────────┘
```
**Data export + account deletion are build-time features** (GDPR), reachable anytime.
No ads section — there are no ads.

---

## Cross-cutting flow principles
- **The mission is never a gate** — give/protect viewable & pledgeable free.
- **Honesty in copy** everywhere — "active in your region this season," never "here now."
- **No ads anywhere** — the app ships without an ad SDK (ECONOMY decision).
- **Never notification-dependent** — This Week (§3) guarantees a session for users with
  push declined or muted.
- **No upsell on delight moments** — collect, catch-success, and help moments stay clean;
  the only conversion surface is the free-catch counter and the Store itself.
- **Consent & deletion first-class** — reachable from Settings at all times.
- **Safety** — catch spots on public/accessible land only, hazards excluded.
- **Localized** — all copy runs through i18n (device locale, overridable); species names and
  content are per-locale with English fallback ([INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)).
- **Every species card has a photo** — the hero image, from license-clear sources with
  attribution ([DATA-SOURCING-LICENSING.md](DATA-SOURCING-LICENSING.md)).
