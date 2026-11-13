"""Species Wikipedia files under another name: photo, fact and names via synonyms (T-260).

GBIF names a species by its own taxonomy, Wikipedia and Wikidata by theirs. When they differ, every
lookup by name misses: *Thysselinum palustre* (GBIF) is *Peucedanum palustre* everywhere else
("kärrsilja"), so its card had no photo, no fact and no Swedish name. 244 catalogue species
(2026-11-13) have no Wikipedia article in any language under their GBIF name.

For each of them a better-known name is looked for, in this order:
  A. Wikidata's own synonym link: an item that lists this name as its taxon synonym (P1420). The
     goshawk is *Astur gentilis* on Wikidata and Wikipedia, *Accipiter gentilis* at GBIF.
  B. GBIF's synonyms of the species, keeping the one with the most Wikipedia articles.

Through that name, only empty slots are filled: the fact in each language (Wikipedia), the names
(the T-258 Wikidata rules), and the photo (Wikipedia, then iNaturalist, never a file another
species already shows). Nothing already there is replaced, and a content rebuild keeps what is
filled here (the loader coalesces name and fact).

    SUPABASE_DB_URL=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python pipeline/resolve_synonyms.py
"""

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

SPARQL = "https://query.wikidata.org/sparql"
USER_AGENT = "nearby-nearlife-pipeline/0.1 (species synonyms; github.com/tudorgrigoriu90/nearlife)"

_LINKS_Q = """SELECT ?name (MAX(?n) AS ?links) WHERE {
  VALUES ?name { %s } ?i wdt:P225 ?name . ?i wikibase:sitelinks ?n } GROUP BY ?name"""
_P1420_Q = """SELECT ?name ?alias ?n WHERE {
  VALUES ?name { %s } ?old wdt:P225 ?name . ?new wdt:P1420 ?old .
  ?new wikibase:sitelinks ?n . ?new wdt:P225 ?alias }"""


def orphans(names: list[str], links: dict[str, int]) -> list[str]:
    """Names with no Wikipedia article in any language, in the order given."""
    return [n for n in names if links.get(n, 0) == 0]


def gbif_synonyms(results: list[dict], accepted: str) -> list[str]:
    """Species-rank synonym names from GBIF's /synonyms results, without repeats."""
    out: list[str] = []
    for r in results:
        name = r.get("canonicalName")
        if r.get("rank") == "SPECIES" and name and name != accepted and name not in out:
            out.append(name)
    return out


def pick_alias(wikidata_links: list[tuple[int, str]], gbif_links: list[tuple[int, str]]) -> str | None:
    """Wikidata's own synonym link first, else the GBIF synonym with the most articles."""
    for candidates in (wikidata_links, gbif_links):
        best = max((c for c in candidates if c[0] > 0), default=None)
        if best:
            return best[1]
    return None


def photo_row(species_id: str, found: dict, licence: str, url: str) -> dict:
    """The species_media row; `licence` is already the app's form (CC0 / CC-BY / CC-BY-SA)."""
    return {
        "species_id": species_id,
        "url": url,
        "source_url": found["sourceUrl"],
        "author": found.get("author") or "Unknown",
        "license": licence,
    }


class Wikidata:
    def __init__(self):
        import requests

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"})

    def rows(self, query: str) -> list[dict]:
        for attempt in range(5):
            resp = self.session.post(SPARQL, data={"query": query}, timeout=120)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(min(60, 5 * 2**attempt))
                continue
            resp.raise_for_status()
            time.sleep(1)
            return resp.json()["results"]["bindings"]
        raise RuntimeError("Wikidata kept refusing")

    def batched(self, template: str, names: list[str], size: int) -> list[dict]:
        out: list[dict] = []
        for i in range(0, len(names), size):
            values = " ".join(json.dumps(n, ensure_ascii=False) for n in names[i : i + size])
            out.extend(self.rows(template % values))
        return out

    def link_counts(self, names: list[str]) -> dict[str, int]:
        return {b["name"]["value"]: int(b["links"]["value"]) for b in self.batched(_LINKS_Q, names, 250)}

    def synonym_links(self, names: list[str]) -> dict[str, list[tuple[int, str]]]:
        out: dict[str, list[tuple[int, str]]] = {}
        for b in self.batched(_P1420_Q, names, 100):
            out.setdefault(b["name"]["value"], []).append((int(b["n"]["value"]), b["alias"]["value"]))
        return out


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    base = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not (dsn and base and key):
        raise SystemExit("SUPABASE_DB_URL, SUPABASE_URL and SUPABASE_SERVICE_KEY are all required.")

    import psycopg
    import requests

    from backfill_facts import FILL_SQL as FACT_SQL
    from build_species_photos import UPSERT_SQL, fresh_photo, public_url, storage_path
    from build_wikidata_names import FILL_SQL as NAME_SQL
    from build_wikidata_names import fetch as fetch_names
    from media.inaturalist import INaturalistClient
    from media.licenses import app_license
    from media.supabase_upload import fetch_with_retry, upload_one
    from media.templates_i18n import LOCALES
    from media.wikimedia import WikimediaClient

    wd = Wikidata()
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            "select s.id, s.scientific_name, s.gbif_key, m.url is not null "
            "from public.species s left join public.species_media m on m.species_id = s.id "
            "where s.in_catalogue order by s.scientific_name"
        )
        species = cur.fetchall()
        lost = set(orphans([s[1] for s in species], wd.link_counts([s[1] for s in species])))
        targets = [s for s in species if s[1] in lost]
        print(f"{len(targets)} species without a Wikipedia article under their name", flush=True)

        via_wikidata = wd.synonym_links([t[1] for t in targets])
        gbif = requests.Session()
        gbif_syn: dict[str, list[str]] = {}
        for _, name, gbif_key, _ in targets:
            if name in via_wikidata or gbif_key is None:
                continue
            r = gbif.get(f"https://api.gbif.org/v1/species/{gbif_key}/synonyms", params={"limit": 100}, timeout=60)
            if r.ok:
                gbif_syn[name] = gbif_synonyms(r.json().get("results", []), name)
            time.sleep(0.2)
        syn_links = wd.link_counts(sorted({s for v in gbif_syn.values() for s in v}))
        alias: dict[str, str] = {}
        for _, name, _, _ in targets:
            found = pick_alias(
                via_wikidata.get(name, []),
                [(syn_links.get(s, 0), s) for s in gbif_syn.get(name, [])],
            )
            if found:
                alias[name] = found
        print(f"{len(alias)} found under another name", flush=True)
        id_of = {name: sid for sid, name, _, _ in targets}

        # Facts, per language, through the other name.
        wiki = WikimediaClient()
        facts_filled = 0
        for locale in LOCALES:
            try:
                facts = wiki.fetch_extracts(sorted(set(alias.values())), locale)
            except Exception as exc:  # one language's failure skips that language, not the run
                print(f"  ! [{locale}] {exc}", flush=True)
                continue
            rows = [
                {"species_id": id_of[name], "locale": locale, "fact": facts[other]}
                for name, other in alias.items()
                if facts.get(other)
            ]
            cur.executemany(FACT_SQL, rows)
            facts_filled += cur.rowcount if cur.rowcount and cur.rowcount > 0 else 0
            conn.commit()
        print(f"facts written (empty slots only): {facts_filled}", flush=True)

        # Names, through the other name, written under the species' own scientific name.
        names = fetch_names(sorted(set(alias.values())))
        name_rows = [
            {"sci": name, "locale": locale, "name": n}
            for name, other in alias.items()
            for locale, n in sorted(names.get(other, {}).items())
        ]
        cur.executemany(NAME_SQL, name_rows)
        conn.commit()
        print(f"name candidates: {len(name_rows)} (empty slots only)", flush=True)

        # Photos, for those without one.
        inat = INaturalistClient()
        downloads = requests.Session()
        downloads.headers.update(wiki.session.headers)
        cur.execute("select source_url from public.species_media where source_url is not null")
        used = {r[0] for r in cur.fetchall()}
        photos = 0
        for sid, name, _, has_photo in targets:
            other = alias.get(name)
            if has_photo or not other:
                continue
            try:
                found = fresh_photo(wiki.fetch_image(other), used)
                licence = app_license(found.get("license")) if found else None  # Wikimedia's names
                if not licence:
                    found = fresh_photo(inat.fetch_image(other), used)
                    licence = found["license"] if found else None  # already the app's form
                if not (found and licence):
                    continue
                img = fetch_with_retry(downloads, found["imageUrl"])
                path = storage_path(sid)
                upload_one(base, key, path, img.content, img.headers.get("Content-Type") or "image/jpeg")
                row = photo_row(sid, found, licence, public_url(base, path))
                cur.execute(UPSERT_SQL, row)
                conn.commit()
                used.add(row["source_url"])
                photos += 1
            except Exception as exc:  # one species' failure must not end the run
                print(f"  ! {name} ({other}): {exc}", flush=True)
        print(f"photos added: {photos}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
