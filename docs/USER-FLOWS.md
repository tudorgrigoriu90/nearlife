# Nearby — User Flows & Wireframes

> Screen inventory, wireframe-level specs, and key journeys. Mechanics → [GDD.md](GDD.md);
> implementation → [TSD.md](TSD.md); compliance copy → [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md).
> Wireframes are text sketches (portrait phone, ~single column). Status: **draft v1**.

---

## Screen inventory (MVP)
1. Onboarding (multi-step) · 2. Home / Almanac · 3. Species Card · 4. Notification → Card ·
5. Catch flow (map + minigame) · 6. Help / Pledge · 7. Family · 8. Store · 9. Settings

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
  a restricted, no-ads, minimal-data path (or parent-managed via Family).
- **3. Location permission**: pre-prompt explainer *before* the OS dialog — purpose string
  "to tell you what wildlife is active around you." Request **while-in-use** only. `[Allow]`
  `[Not now]` (app still works with manual region).
- **4. Notifications**: pre-prompt "This is how you discover species — one gentle ping when
  something's active nearby." `[Enable]` `[Maybe later]`.
- **5. Consent** (granular, no pre-ticked boxes): Location (needed) · Notifications · Analytics
  (opt) · Ads/personalization (opt, off for minors). `[Continue]`.
- **Finish**: set home region (auto from location or picker) → **immediate first Spotted demo**
  so the core payoff is felt in onboarding.

**States**: permission denied → non-blocking; region-picker fallback. Existing account → login.

---

## 2. Home / Almanac (the collection = the home screen)

```
┌────────────────────────────┐
│ Kronoberg ▾        ⚙  👪   │  region · settings · family
├────────────────────────────┤
│ Spotted 142 · Caught 38 ·  │  progress summary (3 tiers)
│ Helped 12                  │
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

**Components**: region switcher (locked regions show ‹paid› lock + link to Store); 3-tier
progress; filters; species grid with tier-state overlays; badges + collective-impact entry.
**States**: empty (new user → "Your almanac is waiting — we'll ping you soon"); locked region
(preview + `[Unlock]`); loading skeletons.
**Interactions**: tap species → Card; tap Impact → community counters; tap region lock → Store.

---

## 3. Species Card (the content surface)

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
│      [ 📍 Find it nearby ]  │  → Catch flow ‹paid: Caught›
└────────────────────────────┘
```

**Free vs paid**: fact (Tier 1), when/how, and **both give & protect actions are always
free**. Depth tiers 2–5 unlock by play or purchase. "Find it nearby" (Caught) is ‹Full Game›.
**States**: not-yet-Spotted (silhouette + "not in your almanac yet"); locked catch (→ Store);
already caught/helped (checkmarks, timestamps, prime-bonus badge).
**Copy rule**: never "here right now" — "active in your region this season."

---

## 4. Notification → Card (the core loop)

```
[Push] "A Common Swift is active in your area this season 🐦"
   │ tap
   ▼
[Species Card] opens → auto-marked ● Spotted → toast "Added to your almanac (+1)"
```
Frictionless: viewing needs no login; an account persists collection across devices.
**No ad here** — never interrupt the delight moment (see ECONOMY ad rules).

---

## 5. Catch flow (map → minigame → Caught) ‹Full Game›

```
Step A — Map of habitat catch spots        Step B — Catch minigame
┌────────────────────────────┐            ┌────────────────────────────┐
│ ‹ back   Find: Swift        │            │   [ animated scene ]        │
│ ┌────────────────────────┐  │            │  Tap when the swift dives!  │
│ │  MapLibre map          │  │            │      ◍ timing ring          │
│ │   ◉ you                │  │            │                            │
│ │   📍 habitat spot(s)   │  │            │   {success → Caught}        │
│ │   (public land only)   │  │            └────────────────────────────┘
│ └────────────────────────┘  │                     │ success
│ "Swifts feed over open      │                     ▼
│  water & rooftops nearby"   │            ┌────────────────────────────┐
│      [ I'm here — catch ]   │            │  ◐ Caught!  (+ prime bonus  │
└────────────────────────────┘            │  ⭐ if in active window)     │
   proximity-gated                        │  🛡 Contextual protect tip:  │
                                          │  "Nests on rooftops here —  │
                                          │   avoid blocking eaves gaps"│
                                          │        [ Nice ]             │
                                          └────────────────────────────┘
```

**Rules**: spots are **habitat-derived (OSM), public-land only**, with hard safety exclusions
(private/road/water/reserve) — see TSD §5. Catch is proximity-gated. **Prime bonus** if within
the species' active window. **Contextual protect tip** fires here — the "killer moment."
**States**: no spots nearby ("no swift habitat within reach — try near water"); too far
(`[Get closer]`); GPS off (prompt).

---

## 6. Help / Pledge (mission, honor system)

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
│        [ I'll do this ]     │
└────────────────────────────┘
   │ pledge
   ▼
◑ Helped → "You + 4,231 others helped swifts this spring 🌍"  (collective impact)
```
No proof required (consistent no-proof ethos). **Never shows an ad.** Feeds `impact_counters`.

---

## 7. Family (shared team) ‹Family SKU›

```
┌────────────────────────────┐
│ ‹ back      Our Household   │
│  Members: 👤Tudor 👦Max     │
│  [ + Invite member ]        │
├────────────────────────────┤
│ Shared almanac              │
│ Spotted 210 · Caught 61 ·   │  any member's actions count for all
│ Helped 24                   │
│ "Max spotted a robin today" │  member activity feed
├────────────────────────────┤
│ 🌍 Our family helped 24     │
│    species this year        │
└────────────────────────────┘
```
Shared almanac / Caught / Helped / impact — a team, not separate players. Toggle personal vs.
family view on Home.

---

## 8. Store (RevenueCat, no dark patterns)

```
┌────────────────────────────┐
│ ‹ back        Unlock Nearby │
│ ┌────────────────────────┐  │
│ │ Full Game      $9.99    │  │  removes ads · Caught + Helped ·
│ │ [ Unlock ]              │  │  all depth tiers · full home region
│ └────────────────────────┘  │
│ ┌────────────────────────┐  │
│ │ Family        $19.99    │  │  everything + shared household
│ │ [ Unlock ]   ★ best     │  │
│ └────────────────────────┘  │
│  Regions  $2.99 each        │
│  World Pass  $19.99         │
│                            │
│  Restore purchases          │
│  ✓ Help & protect content   │
│    is always free.          │  reassurance line = mission integrity
└────────────────────────────┘
```
Value stated plainly; "mission is free" reassurance shown. **No** timers/urgency/dark patterns.

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
│ Privacy                     │
│   [ Export my data ]        │  GDPR — first-class
│   [ Delete account & data ] │
│ Ads: non-personalized ▾     │  off for minors/Family
│ Attribution / About         │  GBIF · © OpenStreetMap
└────────────────────────────┘
```
**Data export + account deletion are build-time features** (GDPR), reachable anytime.

---

## Cross-cutting flow principles
- **The mission is never a gate** — give/protect viewable & pledgeable free.
- **Honesty in copy** everywhere — "active in your region this season," never "here now."
- **No ad** on collect, catch-success, or help moments (ECONOMY rules).
- **Consent & deletion first-class** — reachable from Settings at all times.
- **Safety** — catch spots on public/accessible land only, hazards excluded.
