"""Fill species names GBIF lacks from Wikidata, in every app language (T-258).

GBIF's vernacular names (build_vernacular.py, T-188) are thin outside the big European languages:
Romanian 793 of 7,974 catalogue species, Arabic 1,026, Somali 59. So with Romanian as the second
language, the card text was translated but the title stayed Swedish only ("Öring", not
"Öring / Păstrăv"). Wikidata holds far more names, from three sources per species:

  1. a stated common name (P1843 in that language) — "this IS the name";
  2. the title of that language's Wikipedia article — where an editor filed the species;
  3. the item's label in that language.

That is the order of trust (vernacular/sources.merge_sources has the reasoning for 1 over 2). Any
candidate that is just the binomial is dropped, so a card never claims Latin as a language's word,
and "(…)" disambiguators are stripped. GBIF's own names always win; this only fills gaps.

Two uses, both a few minutes (one SPARQL query per 150 species, all languages at once):
  - in the data pipeline, before the content build: merges into data/vernacular.json, which the
    content build reads;
  - on its own (`--load`, the Species names workflow): writes the names straight into the empty
    `species_content.common_name` slots, so cards get them without rebuilding all card text.
    Names already there (GBIF's, or a curated one) are never overwritten.

    python pipeline/build_wikidata_names.py            # merge into data/vernacular.json
    SUPABASE_DB_URL=... python pipeline/build_wikidata_names.py --load
"""

import json
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from media.templates_i18n import LOCALES  # noqa: E402
from vernacular.sources import _clean, _is_real_name  # noqa: E402

DATA = Path(__file__).resolve().parent / "data"
CATALOGUE = DATA / "catalogue.json"
VERNACULAR = DATA / "vernacular.json"
SPARQL = "https://query.wikidata.org/sparql"
USER_AGENT = "nearby-nearlife-pipeline/0.1 (species names; github.com/tudorgrigoriu90/nearlife)"
BATCH = 150
PAUSE_S = 2.0

# App locale → the Wikimedia language codes that carry it. Kurmanji's Wikipedia is ku.wikipedia.
WIKI_LANG: dict[str, list[str]] = {loc: [loc] for loc in LOCALES}
WIKI_LANG["kmr"] = ["kmr", "ku"]
_LOCALE_OF = {code: loc for loc, codes in WIKI_LANG.items() for code in codes}

_RANK = {"cn": 0, "wiki": 1, "label": 2}

_QUERY = """SELECT ?name ?kind ?lang ?v WHERE {
  VALUES ?name { %s }
  ?i wdt:P225 ?name .
  {
    ?i wdt:P1843 ?v . BIND("cn" AS ?kind)
  } UNION {
    ?a schema:about ?i ; schema:isPartOf ?site ; schema:name ?v .
    ?site wikibase:wikiGroup "wikipedia" . BIND("wiki" AS ?kind)
  } UNION {
    ?i rdfs:label ?v . BIND("label" AS ?kind)
  }
  BIND(LANG(?v) AS ?lang)
  FILTER(?lang IN (%s))
}"""


def query_for(names: list[str]) -> str:
    values = " ".join(json.dumps(n, ensure_ascii=False) for n in names)
    langs = ", ".join(f'"{code}"' for code in sorted(_LOCALE_OF))
    return _QUERY % (values, langs)


def names_from_rows(rows: list[dict]) -> dict[str, dict[str, str]]:
    """{scientific name: {locale: name}}, the most trusted real name per locale."""
    best: dict[tuple[str, str], tuple[int, str]] = {}
    for r in rows:
        sci = r.get("name", {}).get("value", "")
        locale = _LOCALE_OF.get(r.get("lang", {}).get("value", ""))
        rank = _RANK.get(r.get("kind", {}).get("value", ""))
        name = _clean(r.get("v", {}).get("value", ""))
        if not sci or locale is None or rank is None or not _is_real_name(name, sci):
            continue
        current = best.get((sci, locale))
        # Ties keep the alphabetically first, so a rerun writes the same file.
        if current is None or (rank, name) < current:
            best[(sci, locale)] = (rank, name)
    out: dict[str, dict[str, str]] = {}
    for (sci, locale), (_, name) in sorted(best.items()):
        out.setdefault(sci, {})[locale] = name
    return out


def merge_into_vernacular(
    vernacular: dict, key_by_name: dict[str, int], wikidata: dict[str, dict[str, str]]
) -> tuple[dict, Counter]:
    """Add Wikidata names where GBIF has none; returns the merged file and per-locale additions."""
    names = vernacular.setdefault("names", {})
    added: Counter = Counter()
    for sci, by_locale in wikidata.items():
        key = key_by_name.get(sci)
        if key is None:
            continue
        entry = names.setdefault(str(key), {})
        for locale, name in by_locale.items():
            if not entry.get(locale):
                entry[locale] = name
                added[locale] += 1
    return vernacular, added


# Fills only empty slots: a name the database already has (GBIF's, or a curated one) stays.
FILL_SQL = (
    "update public.species_content c set common_name = %(name)s "
    "from public.species s where s.id = c.species_id and s.scientific_name = %(sci)s "
    "and c.locale = %(locale)s and (c.common_name is null or c.common_name = '')"
)


def fill_rows(wikidata: dict[str, dict[str, str]]) -> list[dict]:
    return [
        {"sci": sci, "locale": locale, "name": name}
        for sci, by_locale in sorted(wikidata.items())
        for locale, name in sorted(by_locale.items())
    ]


def fetch(names: list[str]) -> dict[str, dict[str, str]]:
    import requests

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"})
    out: dict[str, dict[str, str]] = {}
    for i in range(0, len(names), BATCH):
        chunk = names[i : i + BATCH]
        for attempt in range(5):
            resp = session.post(SPARQL, data={"query": query_for(chunk)}, timeout=120)
            if resp.status_code in (429, 500, 502, 503, 504):
                time.sleep(min(60, 5 * 2**attempt))
                continue
            resp.raise_for_status()
            break
        else:
            raise RuntimeError(f"Wikidata kept refusing the batch at {i}")
        out.update(names_from_rows(resp.json()["results"]["bindings"]))
        print(f"  {min(i + BATCH, len(names))}/{len(names)}", flush=True)
        time.sleep(PAUSE_S)
    return out


def load(dsn: str) -> int:
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("select scientific_name from public.species where in_catalogue order by 1")
        names = [r[0] for r in cur.fetchall()]
        print(f"{len(names)} catalogue species", flush=True)
        rows = fill_rows(fetch(names))
        cur.execute(
            "select c.locale, count(*) filter (where c.common_name is not null and c.common_name <> '') "
            "from public.species_content c join public.species s on s.id = c.species_id and s.in_catalogue "
            "group by c.locale"
        )
        before = dict(cur.fetchall())
        cur.executemany(FILL_SQL, rows)
        conn.commit()
        cur.execute(
            "select c.locale, count(*) filter (where c.common_name is not null and c.common_name <> '') "
            "from public.species_content c join public.species s on s.id = c.species_id and s.in_catalogue "
            "group by c.locale order by c.locale"
        )
        print("species with a name, per locale (before → after):")
        for locale, after in cur.fetchall():
            print(f"  {locale}: {before.get(locale, 0)} → {after}")
    return 0


def main() -> int:
    if "--load" in sys.argv:
        import os

        dsn = os.environ.get("SUPABASE_DB_URL")
        if not dsn:
            raise SystemExit("SUPABASE_DB_URL is required for --load.")
        return load(dsn)
    included = json.loads(CATALOGUE.read_text(encoding="utf-8"))["included"]
    key_by_name = {sp["scientificName"]: int(sp["speciesKey"]) for sp in included}
    vernacular = json.loads(VERNACULAR.read_text(encoding="utf-8")) if VERNACULAR.exists() else {"names": {}}
    wikidata = fetch(sorted(key_by_name))
    merged, added = merge_into_vernacular(vernacular, key_by_name, wikidata)
    VERNACULAR.write_text(json.dumps(merged, ensure_ascii=False), encoding="utf-8")
    total = len(key_by_name)
    print("names added from Wikidata, per locale (now / catalogue):")
    for locale in sorted(LOCALES):
        have = sum(1 for k in key_by_name.values() if merged["names"].get(str(k), {}).get(locale))
        print(f"  {locale}: +{added.get(locale, 0)} → {have}/{total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
