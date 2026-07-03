# Nearby — Internationalization & Localization (i18n / l10n)

> **Purpose:** define how the app supports multiple languages, from the Sweden alpha to an
> EU-wide launch. Getting the architecture right *now* is cheap; retrofitting it later is not.
> Related: content authoring [GDD §3,§5](GDD.md); data model [TSD §3](TSD.md); expansion
> economics [ECONOMY.md](ECONOMY.md); per-country legal [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md).

---

## Phasing (matches the go-to-market)

| Phase | Market | Languages |
|-------|--------|-----------|
| **Alpha** | All of Sweden | **Swedish + English** |
| **EU launch (phased)** | EU, country by country | The **24 official EU languages**, added per country as content is localized and reviewed |

**Architect for all 24 now; translate in phases.** Shipping in a country is gated not by code
but by *localized content + review* — which is a real cost, so it rolls out market by market
(the same logic as regions being growth spend — see [ECONOMY.md](ECONOMY.md)).

### The 24 official EU languages (target locales)
Bulgarian (bg), Croatian (hr), Czech (cs), Danish (da), Dutch (nl), English (en), Estonian (et),
Finnish (fi), French (fr), German (de), Greek (el), Hungarian (hu), Irish (ga), Italian (it),
Latvian (lv), Lithuanian (lt), Maltese (mt), Polish (pl), Portuguese (pt), Romanian (ro),
Slovak (sk), Slovenian (sl), Spanish (es), Swedish (sv).

All are left-to-right — **no RTL layout work needed.**

---

## What has to be localized (and how hard each is)

| Surface | Volume | Strategy |
|---------|--------|----------|
| **UI strings** (buttons, labels, onboarding, settings, store) | Small, stable (~hundreds) | Translate once per language; MT + light native review is fine. |
| **Species common names** | 1 per species per language | Curated from authoritative local sources (a swift is *tornseglare* in sv). Scientific name stays the language-independent key. |
| **Species content** (fact, when/how, give, protect) | **Large** — 4 fields × 50+ species × 24 languages | **The main cost.** MT **plus native review**. Never raw MT for give/protect — it is correctness- and law-sensitive. |
| **Notifications** | Small templates + species name | Localized templates; species name from the localized name table. |
| **Legal / store copy** | Small | Professional/native review (legal text). |

**Photos are NOT localized** — one image set serves all locales (see photo sourcing in
[DATA-SOURCING-LICENSING.md](DATA-SOURCING-LICENSING.md)). This is why media scales across the
EU far more cheaply than text.

---

## Architecture

- **Stable key:** `species.scientific_name` (and `species.id`) never change across languages.
  Common names and content are looked up by `(species_id, locale)`.
- **Fallback chain:** requested locale → base **English** → the raw key. The app is never blank
  in an unlocalized locale; it degrades to English, then shows a "not yet translated" state
  rather than a missing string.
- **Locale resolution:** device locale via `expo-localization`, mapped to the nearest supported
  locale; user can override in Settings. Region (hometown, [ECONOMY.md](ECONOMY.md)) and
  language are **independent** — a Swede abroad keeps Swedish; a German in Sweden gets German UI
  with Kronoberg content.
- **Formatting:** numbers, dates, and lists via the platform `Intl` APIs, not hand-rolled.
- **Runtime:** a lightweight, dependency-light i18n layer (typed string keys + per-locale
  catalogs) so missing keys are a **type error**, not a runtime blank. See TSD for the stack.

### Data model impact (folded into [TSD §3](TSD.md))
- `species_content` is keyed by **`locale`** as well as `species_id` + `tier`.
- New localized **`species_name`** (`species_id`, `locale`, `common_name`).
- Content **translation status** is tracked so we know what is human-reviewed vs. MT vs. missing.

---

## Translation operations

1. **English is the source of truth.** All content authored in English first, then translated.
2. **UI strings:** MT + light review; cheap and stable.
3. **Species content:** MT to seed, then **native-speaker review before that language ships** —
   especially give/protect (conservation correctness + local law).
4. **Never ship a language whose give/protect advice has not been reviewed** for that country —
   this is the same non-negotiable as region content vetting ([GDD §5](GDD.md)).
5. **Track status per (species, locale, field):** `missing` → `machine` → `reviewed`. A locale
   goes live for a market only when its content reaches `reviewed`.

---

## Cost & sequencing reality
- UI localization is a one-time, low cost per language.
- Species-content localization is the dominant cost and scales with species × languages ×
  review. Treat each new **country/language as growth spend** (translation + native review +
  local law), justified by the new home market it opens — exactly the region model in
  [ECONOMY.md](ECONOMY.md).
- **Recommendation:** ship alpha in sv + en; add EU languages in priority-market order, each
  only when its content is reviewed. Do not gate the EU launch on all 24 being ready at once.

## Open decisions
- [ ] Translation vendor / workflow (professional vs. MT+community+review) per language tier.
- [ ] Which EU markets to prioritise after Sweden (drives language order).
- [ ] Per-country GDPR-K consent age handling at scale (13–16 varies; see PRIVACY-COMPLIANCE).
- [ ] Localized common-name sources per language (authoritative national species lists).
