# Nearby — Technical Spec Document (TSD)

> Architecture, stack, data model, and the notification engine. Governed by: **cost ≈ $0**
> and **Claude builds everything** (mainstream, strongly-typed, large-training-footprint tech).

---

## 1. Stack (decision, not menu)

| Layer | Choice | Cost | Why |
|-------|--------|------|-----|
| **Mobile app** | **Expo (React Native) + TypeScript** | $0 | One codebase → iOS + Android; Claude expert-level; built-in push, geolocation, background tasks, OTA; cloud builds (no Mac needed) |
| **Backend + DB** | **Supabase** (Postgres + **PostGIS**, Auth, Storage, Edge Functions, `pg_cron`) | $0 free tier | Spatial-native (PostGIS = exactly the notification model); managed; Claude strong in Postgres/SQL/TS |
| **Spatial index** | **H3** (`h3-js` / `h3-py`) | $0 | Per-cell probability model; free Uber library |
| **Maps** | **MapLibre GL** + free tiles (Protomaps/MapTiler free) | $0 | Open-source; avoids Google Maps billing |
| **Data pipeline** | **Python** batch in **GitHub Actions** | $0 | Free CI minutes; Claude expert in Python/pandas; loads into Supabase |
| **Push** | **Expo Notifications** → FCM/APNs; scheduled via `pg_cron` + Edge Function | $0 | Notification engine runs server-side on schedule |
| **IAP** | **RevenueCat** | $0 under $2.5k/mo | Abstracts App Store + Play billing (Family entitlements arrive in v2) |
| **Analytics** | **PostHog** free tier | $0 | Measures day-7 retention (the core validation metric) |
| **Auth** | **Supabase Auth** | $0 | Email/social; extends to the household model in v2 |
| **i18n** | **`expo-localization`** (device locale) + lightweight typed catalog | $0 | Localizes UI + species content across the 24 EU languages; typed keys so missing strings are compile errors. See [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md) |

### Honest cost floor
Everything above is $0 at MVP scale. **Only unavoidable costs:** Apple Developer ~$99/yr,
Google Play $25 one-time. Optional later: Supabase Pro (~$25/mo), EAS build minutes — not
needed until real traction.

### Rejected alternatives (for the record)
- **Flutter:** fine, but RN+TS keeps one language across app + edge functions + pipeline tooling.
- **Firebase:** great push/auth, but Firestore is *not* spatial; our core model is geospatial.
- **Google Maps:** metered billing from day one — rejected on cost.
- **Native Swift/Kotlin:** doubles build surface, needs a Mac — rejected on both principles.
- **Ad SDK (AdMob etc.):** rejected permanently, not deferred — negligible revenue at this
  session frequency, large kids-compliance surface, brand damage (see ECONOMY / PRIVACY-COMPLIANCE).

---

## 2. Architecture overview

```
[GBIF / eBird / IUCN / OSM]  --(Python batch, GitHub Actions)-->  [Supabase Postgres+PostGIS]
                                                                        |
                                    precomputed per-cell-per-month species probability
                                                                        |
             [pg_cron schedule] --> [Edge Function: notification engine] --> [Expo Push -> FCM/APNs]
                                                                        |
[Expo RN app] <---- Supabase Auth / REST / Realtime ----> reads cards, writes collection state
        |
   MapLibre (catch spots)  +  RevenueCat (entitlements)  +  PostHog (analytics)
```

Offline batch pipeline does the heavy data work; the runtime is a thin read/write layer plus a
scheduled notification job. This keeps runtime cost and complexity minimal.

---

## 3. Data model (Postgres + PostGIS)

Core tables (key columns; not exhaustive):

**Reference / content**
- `species` — `id`, `scientific_name` (**language-independent stable key**), `category`
  (bird/insect/plant/mammal…), `rarity_base`, `iucn_status`. (Common name is localized — see
  `species_name`.)
- `species_name` — `species_id`, `locale`, `common_name`. Localized common name per language
  (a swift is *tornseglare* in `sv`). See [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md).
- `species_content` — `species_id`, **`locale`**, `tier` (1–5), `fact`, `trivia`,
  `when_how_to_see`, `give_action`, `protect_action`, `iucn_threat`, `review_status`
  (`missing`/`machine`/`reviewed`). (Tier 1 + all give/protect = always free. Content is keyed
  by locale; English is the base with fallback; a locale ships for a market only when
  `review_status = reviewed`.)
- `species_media` — `species_id`, `url`, `license`, `author`, `source_url`, `is_primary`.
  Species photos (language-independent; Wikimedia Commons CC0/CC-BY/CC-BY-SA — see
  [DATA-SOURCING-LICENSING.md](DATA-SOURCING-LICENSING.md)). Stored in Supabase Storage.
- `habitat_types` — `id`, `name`, `osm_tag_rules` (what OSM tags map to this habitat).
- `species_habitat` — `species_id`, `habitat_type_id` (which habitats a species is catchable in).
- `species_season` — `species_id`, `region_id`, `month`, `presence_prob`, `is_active_window`.

**Spatial**
- `h3_cells` — `h3_index` (res ~7–8), `region_id`, `geom`, dominant habitat tags.
- `cell_species_month` — `h3_index`, `species_id`, `month`, `probability` (precomputed; the
  table the notification engine samples from).
- `catch_spots` — `id`, `h3_index`, `geom`, `habitat_type_id`, `safety_flags` (excluded if on
  private/road/water/reserve).

**User / state**
- `users` — `id` (Supabase auth), `home_region_id` (**GPS-derived at signup** — device
  location resolved to a coarse region; the coordinates are discarded, only the region id is
  stored; **locked**, support-only change; the freemium experience is anchored to it),
  `notif_prefs`, `quiet_hours`,
  `free_catches_used`, `free_catch_season` (free tier gets **3 catches per season**; the
  counter resets when the season key rolls over; enforced server-side, not client-side).
- `households` / `household_members` — **post-validation (v2)**, ship with the Family SKU.
  Not built in v1; `collection.owner_id` is designed to accept either so the migration is
  additive.
- `collection` — `owner_id` (user in v1; user-or-household in v2), `species_id`, `spotted_at`,
  `caught_at`, `helped_at`, `helped_kind` (give/protect), `prime_bonus` (bool), `tier_reached`.
- `pledges` — `owner_id`, `species_id`, `action`, `kind`, `pledged_at` (feeds collective impact).
- `entitlements` — mirror of RevenueCat: `full_game` (v1); `family`, `region_packs[]`,
  `world_pass` (v2).

**Aggregates**
- `impact_counters` — `region_id`, `metric`, `value` (community totals; refreshed by cron).

---

## 4. Notification engine (the heart)

Runs server-side on a schedule (`pg_cron` → Edge Function). For each due user:

```
1. Resolve user's H3 cell (from last-known coarse location + home_region).
2. Candidate set = cell_species_month WHERE h3_index = cell AND month = current
                   AND is_active_window (season gate — hard constraint).
3. Remove species already in the user's collection this cycle (dedupe).
4. Weight each candidate:  w = presence_prob  ×  rarity_flavor(species)
      - rarity_flavor rewards surfacing rarer-but-plausible species occasionally,
        so the feed isn't all sparrows. (NOTE: rarity here reflects observation
        frequency, not true rarity — phrase copy honestly; see risks.)
5. Sample 1 species from the weighted distribution.
6. Respect cadence: frequency cap + quiet_hours + user notif_prefs.
7. Send via Expo Push. Log for analytics (delivered / opened / collected).
```

**Tuning levers:** cadence (per day), cell resolution (granularity vs. data density),
rarity_flavor curve, active-window strictness. All should be config, not hardcoded, so the
fake-it prototype can tune the *feel* without redeploys.

### 4b. "Active this week" (the pull surface)

The same `cell_species_month` table serves an always-available **This Week** screen: species
active in the user's cell/region for the current period, ordered by interest (new-to-user
first, then rarity_flavor). A plain read query — no extra pipeline, no schedule. This is what
makes the product usable with notifications declined or muted (screen spec in
[USER-FLOWS.md](USER-FLOWS.md) §3).

---

## 5. Catch-spot generation & safety

- Ingest OSM features via Overpass → classify into `habitat_types` via `osm_tag_rules`.
- Generate `catch_spots` on public/accessible land only.
- **Hard exclusions (safety/liability):** private property, roads/rail, water hazards,
  protected reserves, restricted-access land. Encode as `safety_flags`; a flagged spot is
  never surfaced. This is a launch requirement, not a later patch.

### 5b. Catch minigames (per species category)

- One minigame style per category — bird: timing; fish: rhythm/tension; insect: trace;
  mammal: stealth; plant/fungus: spot & frame. Design in [GDD.md](GDD.md) §4; species within
  a category reskin the same mechanic.
- Implemented as self-contained React Native components (`react-native-reanimated` +
  `gesture-handler`; no game engine needed) keyed by `species.category`. Each is a 10–20s
  one-thumb interaction — well within RN performance limits.
- **Free-catch enforcement is server-side:** a successful catch calls an Edge Function that
  checks `entitlements.full_game` OR `free_catches_used < 3` for the current
  `free_catch_season` before writing `caught_at`. The client only displays the counter.

---

## 6. Data pipeline

- Python jobs (GitHub Actions, free minutes): pull GBIF occurrences + eBird (if licensed) +
  IUCN threats + OSM habitat; compute H3 cell aggregation and per-month probabilities; upsert
  into Supabase.
- Batch/scheduled (e.g. monthly refresh + season transitions), not real-time — cheap and
  sufficient given data is not real-time anyway.

---

## 7. Technical risks

- **Occurrence ≠ presence.** GBIF/eBird record *where observers went*, not *where animals
  are* — heavy urban/reserve bias. Naive "rarity" measures observation effort. Tune and phrase
  honestly.
- **Licensing is a hard gate** for eBird & IUCN commercial use — see
  [DATA-SOURCING-LICENSING.md](DATA-SOURCING-LICENSING.md) before building the data plane.
- **Conservation advice must not cause harm** — mitigated by design (GDD §5): advice is
  species-level, defaults to universally safe actions, every help card carries a standing
  "follow local law" line, and risky specifics (plant/release a particular species) are
  avoided unless checked for the region. Keeps new regions to a light editorial pass.
- **Location privacy** — sensitive data under GDPR; keep it coarse (cell-level), see
  [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md).

---

## 8. MVP sequencing

1. **Fake-it prototype (≈2 weeks):** hardcode Kronoberg species list, hand-curate ~50 cards
   (fact + trivia + give + protect each), wire Expo notifications + collection UI + the
   **"Active this week" screen** + **one fake catch minigame** (bird timing, no real GPS
   gating) so the free 3-catch taste is testable end-to-end. 20–30 real users. **Measure
   day-7 open rate** — validates the core "is it hollow?" thesis.
2. **If it lands → real data layer:** GBIF ingestion, H3 model, seasonal probability,
   OSM habitat → catch spots.
3. **Then:** remaining catch minigames (fish, insect, mammal, plant/fungus), seasonal events,
   collective-impact counters, local social layer.
4. **Expand region-by-region**, each with vetted conservation advice (modeled as growth
   spend — see [ECONOMY.md](ECONOMY.md)).
5. **v2:** Family SKU + households/shared collection; region packs / World Pass.
