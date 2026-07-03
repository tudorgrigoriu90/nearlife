# Nearby — Data Sourcing & Licensing (GO / NO-GO)

> **Purpose:** determine, before building the data plane, whether we can *legally and
> commercially* use each data source. A wrong assumption here invalidates the product.
> **Status:** Draft analysis — **every "commercial OK?" verdict below must be confirmed in
> writing** (email/agreement) before shipping a paid app on that source.

---

## Why this is gating
The app is **commercial** (paid unlock; no ads). Most biodiversity data is published by
conservation institutions under licenses written for *research and non-commercial* use.
"It has a public API" ≠ "we may build a paid product on it." This doc separates the two.

---

## Source-by-source

### 1. GBIF (Global Biodiversity Information Facility) — occurrence & seasonality
- **What we use:** occurrence records → per-cell/per-month presence probability.
- **License:** individual datasets are CC0 / CC-BY / CC-BY-NC (mixed). The aggregate API is
  open, but **CC-BY-NC datasets cannot be used commercially.**
- **Obligation:** attribution + dataset citation (DOI for downloads).
- **Action:** **filter to CC0 + CC-BY datasets only** in the pipeline; exclude NC. Preserve
  and display attribution. Verdict: **likely OK if filtered** — confirm the filter is enforced.

### 2. eBird (Cornell Lab) — bird occurrence/seasonality
- **What we use:** bird presence + seasonal timing.
- **License:** eBird API Terms restrict use; **commercial use generally requires explicit
  permission / a data-access agreement.** Redistribution is limited.
- **Obligation:** application + approval; attribution to Cornell Lab.
- **Action:** **treat as NO-GO until a written agreement exists.** *Fallback:* GBIF already
  contains large volumes of bird occurrence data (incl. from eBird via licensed datasets) —
  **the MVP can run on GBIF alone** and avoid the eBird dependency entirely for launch. This
  removes the single biggest licensing risk. Verdict: **defer eBird; build on GBIF.**

### 3. IUCN Red List — per-species threats (the "protect" content)
- **What we use:** threat categories per species (pollution, disturbance, invasives, etc.) to
  generate honest, specific protect-actions.
- **License:** Red List API terms restrict commercial use; **commercial use requires
  permission.** Attribution required.
- **Action:** the Helped tier is now **basic species-level advice** (universally safe
  actions + a "follow local law" line — GDD §5), which does **not** require the IUCN API;
  hand-written threat framing from permissively-licensed material covers it. The API becomes
  **optional enrichment** — apply for permission only if/when richer threat data is wanted.
  Verdict: **not needed for launch; non-API content is the default.**

### 4. OpenStreetMap (via Overpass API) — habitat features for catch spots
- **What we use:** land/water/vegetation features → habitat classification → catch spots.
- **License:** **ODbL** — commercial use allowed, but **attribution required** and
  **share-alike** applies to derived *databases*.
- **Obligation:** display "© OpenStreetMap contributors"; if we publish a derived DB, it must
  be ODbL. Using it to *drive app behavior* is fine.
- **Action:** include attribution; keep derived habitat DB internal (or ODbL if published).
  Verdict: **OK with attribution.**

---

## Decision matrix

| Source | Commercial? | MVP decision |
|--------|-------------|--------------|
| GBIF (CC0/CC-BY only) | Yes, if NC filtered | **Use — primary occurrence source** |
| eBird | Only with agreement | **Defer — GBIF covers birds for MVP** |
| IUCN Red List | Only with permission | **Not needed for launch — basic Helped advice is hand-written; API = optional enrichment later** |
| OSM / Overpass | Yes (ODbL, attribution) | **Use — catch-spot habitat** |

**Net:** the MVP can launch on **GBIF (filtered) + OSM**, with hand-curated/region-reviewed
threat content — **no blocking dependency on eBird or the IUCN API.** That is the go path.

---

## Attribution surface (build these into the app now)
- "Biodiversity data: GBIF.org + contributing datasets (cite DOIs)."
- "Map data © OpenStreetMap contributors."
- IUCN attribution *if* the API is used.

## Open actions
- [ ] Enforce CC0/CC-BY-only filter in GBIF pipeline; verify no NC data leaks in.
- [ ] Written confirmation on GBIF commercial use of filtered subset.
- [ ] IUCN Red List permission: deferred — only if richer threat data is wanted later (basic
      Helped advice is hand-written; see GDD §5).
- [ ] Decide eBird agreement application (post-MVP, only if birds need richer data).
- [ ] Legal review of ODbL derived-database obligations before any data export/publish.
