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

### 5. Species photos — the hero image on every card
- **What we use:** one representative photo per species (language-independent — one set serves
  all locales; see [INTERNATIONALIZATION.md](INTERNATIONALIZATION.md)).
- **Primary source: Wikimedia Commons.** Excellent coverage of common European species under
  **CC0 / CC-BY / CC-BY-SA**. Commercial use is allowed **with attribution**.
  - **Exclude CC-BY-NC and ND** (same discipline as the occurrence filter).
  - **Share-alike (CC-BY-SA)** only obliges share-alike if we *modify the image*. Displaying it
    **unmodified** in the app with attribution is fine — do not crop/edit CC-BY-SA photos, or
    treat the edit as CC-BY-SA.
- **Secondary:** GBIF media (filter to CC0/CC-BY, exclude NC) and iNaturalist (CC0/CC-BY only —
  many iNat photos are CC-BY-NC and must be excluded).
- **Obligation:** store and display **author + license + source URL** per photo.
- **Storage:** Supabase Storage; a `species_media` table holds the refs (TSD §3).
- **Action:** source from Wikimedia Commons, record attribution, keep images unmodified.
  Verdict: **OK with per-photo attribution; NC/ND excluded.**

---

## Decision matrix

| Source | Commercial? | MVP decision |
|--------|-------------|--------------|
| GBIF (CC0/CC-BY only) | Yes, if NC filtered | **Use — primary occurrence source** |
| eBird | Only with agreement | **Defer — GBIF covers birds for MVP** |
| IUCN Red List | Only with permission | **Not needed for launch — basic Helped advice is hand-written; API = optional enrichment later** |
| OSM / Overpass | Yes (ODbL, attribution) | **Use — catch-spot habitat** |
| Wikimedia Commons photos (CC0/CC-BY/CC-BY-SA) | Yes, with attribution | **Use — primary species photos; exclude NC/ND, keep unmodified** |

**Net:** the MVP can launch on **GBIF (filtered) + OSM**, with hand-curated/region-reviewed
threat content — **no blocking dependency on eBird or the IUCN API.** That is the go path.

---

## Attribution surface (build these into the app now)
- "Photos: Wikimedia Commons — <author>, <license>" per species photo (link to source).
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

---

## Nordic scope and per-country checklists (v1, T-167)

v1 covers Sweden, Norway, Denmark, Finland and Iceland. GBIF stays the occurrence source, but
"recorded in GBIF" is not "encounterable": raw output carries zoo animals, escapees, one-off
vagrants and misidentifications. Presenting those as *active in your region this season* would
break invariant #1 as surely as an invented fact would.

Each country's noise filter (T-136) is therefore checked against its own national authority:

| Country | Authority | Use |
|---|---|---|
| Sweden | Artdatabanken / Dyntaxa | native + established status, accepted names |
| Norway | Artsdatabanken | as above, incl. alien-species risk list |
| Denmark | Allearter.dk | national species register |
| Finland | FinBIF / laji.fi | national register, occurrence status |
| Iceland | Náttúrufræðistofnun Íslands | national register (small, distinct biota) |

Two consequences worth stating up front:

- **Region ids are fetched, never hardcoded.** GADM level-1 ids come from
  `/geocode/gadm/<ISO3>/subdivisions` at ingest time. A wrong id does not error — it slices
  occurrences by the wrong region and emits well-formed wrong data.
- **Licensing is unchanged and still binding.** Only CC0 / CC-BY occurrences are ingested
  (§1), and only CC0 / CC-BY / CC-BY-SA media (§5), across all five countries.

### Image tiers (T-168)

The app ships a **~40 KB, 400px thumbnail** per species, re-hosted on Supabase Storage. Full
resolution is **never re-hosted**: the card links to the Wikimedia Commons file page instead.

- **Storage.** ~6,800 kept Swedish species at full size would exhaust the 1 GB free tier before
  the other four countries are ingested. At 400px it is ~270 MB for Sweden.
- **Attribution.** The full-size destination is the Commons file page, which carries the author and
  licence — the page CC-BY / CC-BY-SA ask you to credit. The card also shows author + licence
  inline whenever a photo is displayed.
- **Politeness.** Thumbnails are requested via `iiurlwidth`, so Commons resizes server-side and we
  transfer ~40 KB instead of multi-megabyte originals across thousands of species.
