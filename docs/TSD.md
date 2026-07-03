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
| **IAP** | **RevenueCat** | $0 under $2.5k/mo | Abstracts App Store + Play billing; handles family entitlements |
| **Ads** | **Google AdMob** (deferred; kids-compliance) | $0 SDK | Standard; may hold for post-MVP (see PRIVACY-COMPLIANCE) |
| **Analytics** | **PostHog** free tier | $0 | Measures day-7 retention (the core validation metric) |
| **Auth** | **Supabase Auth** | $0 | Email/social; ties to family/household model |

### Honest cost floor
Everything above is $0 at MVP scale. **Only unavoidable costs:** Apple Developer ~$99/yr,
Google Play $25 one-time. Optional later: Supabase Pro (~$25/mo), EAS build minutes — not
needed until real traction.

### Rejected alternatives (for the record)
- **Flutter:** fine, but RN+TS keeps one language across app + edge functions + pipeline tooling.
- **Firebase:** great push/auth, but Firestore is *not* spatial; our core model is geospatial.
- **Google Maps:** metered billing from day one — rejected on cost.
- **Native Swift/Kotlin:** doubles build surface, needs a Mac — rejected on both principles.

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
- `species` — `id`, `scientific_name`, `common_name`, `category` (bird/insect/plant/mammal…),
  `rarity_base`, `iucn_status`, media refs.
- `species_content` — `species_id`, `tier` (1–5), `fact`, `trivia`, `when_how_to_see`,
  `give_action`, `protect_action`, `iucn_threat`. (Tier 1 + all give/protect = always free.)
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
- `users` — `id` (Supabase auth), `home_region_id`, `notif_prefs`, `quiet_hours`.
- `households` — `id`, `owner_user_id`, `entitlement`. `household_members` — `household_id`,
  `user_id`.
- `collection` — `owner_id` (user or household), `species_id`, `spotted_at`, `caught_at`,
  `helped_at`, `helped_kind` (give/protect), `prime_bonus` (bool), `tier_reached`.
- `pledges` — `owner_id`, `species_id`, `action`, `kind`, `pledged_at` (feeds collective impact).
- `entitlements` — mirror of RevenueCat: `full_game`, `family`, `region_packs[]`, `world_pass`.

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

---

## 5. Catch-spot generation & safety

- Ingest OSM features via Overpass → classify into `habitat_types` via `osm_tag_rules`.
- Generate `catch_spots` on public/accessible land only.
- **Hard exclusions (safety/liability):** private property, roads/rail, water hazards,
  protected reserves, restricted-access land. Encode as `safety_flags`; a flagged spot is
  never surfaced. This is a launch requirement, not a later patch.

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
- **Conservation advice is regional & correctness-critical** — "plant this" can be an invasive
  disaster elsewhere; must be region-vetted. Starting in one region (Sweden) makes it tractable.
- **Location privacy** — sensitive data under GDPR; keep it coarse (cell-level), see
  [PRIVACY-COMPLIANCE.md](PRIVACY-COMPLIANCE.md).

---

## 8. MVP sequencing

1. **Fake-it prototype (≈2 weeks):** hardcode Kronoberg species list, hand-curate ~50 cards
   (fact + trivia + give + protect each), wire Expo notifications + collection UI. 20–30 real
   users. **Measure day-7 open rate** — validates the core "is it hollow?" thesis.
2. **If it lands → real data layer:** GBIF/eBird ingestion, H3 model, seasonal probability,
   OSM habitat → catch spots.
3. **Then:** catch minigame, seasonal events, collective-impact counters, local social layer.
4. **Expand region-by-region**, each with vetted conservation advice.
