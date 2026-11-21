"""Protected species for the card (T-337 · review F-01): the Species Protection Ordinance.

Source: Artskyddsförordningen (SFS 2007:845) as amended, the consolidated text riksdagen publishes
at data.riksdagen.se (legislation is not under copyright, upphovsrättslagen 9 §;
DATA-SOURCING-LICENSING §11). What it protects, and the level written to `species.protection`:

- every wild bird (4 §) → `bird`; hunting is excepted (6 b §) and has its own law;
- annex 1 animals marked N or n (4 a §) and plants marked N (7 §) → `annex`;
- annex 2, with its own level per species (5 a, 6, 8, 9 §§) → `strict`, `reinforced`, `basic` or
  `limited`, sometimes only in named counties (→ `species.protection_regions`); two entries cover
  whole families (club mosses, orchids), matched through GBIF's Swedish records of the family.

A species listed more than once gets the strongest level (`LEVEL_ORDER`). Entries for a
subspecies or for populations outside Sweden are skipped, so a common species is never marked
because a rare subspecies of it is. Names are matched on the GBIF backbone (synonyms followed to
the accepted name) and joined on `species.gbif_key`. An invasive species keeps its invasive line.

    SUPABASE_DB_URL=... python pipeline/build_protected.py
"""

import os
import re
import sys

ORDINANCE_URL = "https://data.riksdagen.se/dokument/sfs-2007-845.text"
GBIF = "https://api.gbif.org/v1"

# Strongest first. `annex` (4 a § / 7 §, the Habitats Directive's strict protection) sits between
# the national strict and reinforced levels: same prohibitions, no 9 b § exception.
LEVEL_ORDER = ["strict", "annex", "reinforced", "basic", "limited"]
LEVELS = {
    "Strikt skydd": "strict",
    "Förstärkt skydd": "reinforced",
    "Grundläggande skydd": "basic",
    "Begränsat skydd": "limited",
}

_MARKS = re.compile(r"^((?:[-SBPNnFMJx] ){3,5}[-SBPNnFMJx]) +(\S.*)$")
_BINOMIAL = re.compile(r"^([A-Z][a-zë]+) (×\s?[a-zë-]+|[a-zë][a-zë-]+)")
_SUBSPECIES = re.compile(r"\b(subsp|ssp|var)\.|^[A-Z][a-zë]+ [a-zë-]+ [a-zë]{3,}\b")


def annex_texts(ordinance: str) -> tuple[str, str]:
    """Annex 1 and annex 2, with Unix line ends."""
    text = ordinance.replace("\r\n", "\n").replace("\r", "\n")
    one = text.index("\nBilaga 1\n")
    two = text.index("\nBilaga 2\n", one)
    end = text.find("\nBilaga 3", two)
    return text[one:two], text[two : end if end != -1 else len(text)]


def _swedish_population(qualifier: str) -> bool:
    """Does a population note ("(ej svenska populationer)") leave the Swedish one in?"""
    q = qualifier.lower()
    if "ej svensk" in q or ("endast" in q and "svensk" not in q):
        return False
    if "population" not in q:
        return True
    return "svensk" in q or "övriga" in q or "utanför" in q


def parse_annex1(annex: str) -> list[dict]:
    """Animals marked N or n (4 a §) and plants marked N (7 §), species rank, Swedish populations."""
    lines = annex.split("\n")
    out: list[dict] = []
    section = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped in ("Fåglar",):
            section = "bird"
        elif stripped in ("Däggdjur", "Reptiler", "Groddjur", "Fiskar", "Ryggradslösa djur"):
            section = "animal"
        elif stripped == "VÄXTER":
            section = "plant"
        m = _MARKS.match(line)
        if not m or section in (None, "bird"):
            continue
        marks = m.group(1).split()
        protected = ("N" in marks or "n" in marks) if section == "animal" else "N" in marks
        if not protected:
            continue
        # The scientific column only: the Swedish name sits after a run of spaces.
        text = re.split(r"\s{2,}", m.group(2).strip())[0]
        j = i + 1
        while j < len(lines) and lines[j].startswith(" ") and lines[j].strip():
            text += " " + re.split(r"\s{2,}", lines[j].strip())[0]
            j += 1
        text = re.sub(r"\s+", " ", text)
        # One stray word may lead: the end of the line above, wrapped ("Rouy Asplenium ...").
        text = re.sub(r"^[A-Z][a-z]+\.? (?=[A-Z][a-zë]+ [a-zë])", "", text)
        binomial = _BINOMIAL.match(text)
        if not binomial or re.search(r"\b(subsp|ssp|var)\.", text) or _SUBSPECIES.search(text.split("(")[0]):
            continue
        name = f"{binomial.group(1)} {binomial.group(2)}"
        notes = re.findall(r"\(([^()]*)\)", text)
        if any(not _swedish_population(n) for n in notes):
            continue
        synonyms = [n for n in notes if re.fullmatch(r"[A-Z][a-zë]+ [a-zë-]+", n.strip())]
        out.append({"name": name, "synonyms": [s.strip() for s in synonyms], "kind": section})
    return out


def county_names(area: str) -> list[str]:
    """ "Fridlysningen gäller i Kalmar och Stockholms län" → ["Kalmar", "Stockholm"]."""
    m = re.search(r"gäller i (.+?) län", re.sub(r"\s+", " ", area))
    if not m:
        return []
    parts = re.split(r", | och ", m.group(1))
    # Genitive s ("Stockholms län"); no Swedish county name ends in s.
    return [p.removesuffix("s") for p in (p.strip() for p in parts) if p]


def parse_annex2(annex: str) -> list[dict]:
    """Each row: {"name" or "family", "level", "counties" (None = all of Sweden)}."""
    rows: list[dict] = []
    for block in re.split(r"\n\s*\n", annex):
        flat = re.sub(r"\s+", " ", block).strip()
        m = re.search(r"(5 a|6|8|9) § (Strikt|Förstärkt|Grundläggande|Begränsat) skydd(.*)$", flat)
        if not m:
            continue
        level = LEVELS[f"{m.group(2)} skydd"]
        head = flat[: m.start()].strip()
        area = m.group(3).strip()
        counties = county_names(area) if area.startswith("Fridlysningen") else None
        families = re.findall(r"\b([A-Z][a-z]+aceae)\b", head) if "Samtliga arter" in head else []
        if families:
            rows += [{"family": f, "level": level, "counties": counties} for f in families]
            continue
        inner = re.search(r"\(([^()]+)\)\s*$", head)
        name = (inner.group(1) if inner else head).strip()
        name = re.sub(r"\s+", " ", name)
        if not re.fullmatch(r"[A-Z][a-zë]+ (× ?)?[a-zë-]+", name):
            continue  # a subspecies or a variety
        rows.append({"name": name, "level": level, "counties": counties})
    return rows


def strongest(levels: list[str]) -> str:
    return min(levels, key=LEVEL_ORDER.index)


# ── network and database (not unit-tested; the parsers above are) ────────────────────────────


def match_key(session, name: str, kingdom: str) -> int | None:
    """The accepted GBIF backbone key for a name, or None for anything short of a sure match."""
    resp = session.get(f"{GBIF}/species/match", params={"name": name, "kingdom": kingdom, "strict": "true"}, timeout=60)
    resp.raise_for_status()
    body = resp.json()
    if body.get("matchType") != "EXACT" or body.get("rank") != "SPECIES":
        return None
    return int(body.get("acceptedUsageKey") or body["usageKey"])


def family_species_in_sweden(session, family: str) -> list[int]:
    """Species keys of a family with records in Sweden (orchids, club mosses: a few dozen)."""
    resp = session.get(f"{GBIF}/species/match", params={"name": family, "rank": "FAMILY", "strict": "true"}, timeout=60)
    resp.raise_for_status()
    key = resp.json().get("usageKey")
    if not key:
        return []  # Cypripediaceae, for one, is part of Orchidaceae on the backbone
    resp = session.get(
        f"{GBIF}/occurrence/search",
        params={"country": "SE", "familyKey": key, "limit": 0, "facet": "speciesKey", "facetLimit": 1000},
        timeout=120,
    )
    resp.raise_for_status()
    facets = resp.json().get("facets") or [{"counts": []}]
    return [int(c["name"]) for c in facets[0]["counts"]]


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")

    import psycopg
    import requests

    from resolve_synonyms import USER_AGENT

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    resp = session.get(ORDINANCE_URL, timeout=120)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    one, two = annex_texts(resp.text)
    annex1, annex2 = parse_annex1(one), parse_annex2(two)
    # About 100 Swedish N/n entries and 180 annex 2 rows; far fewer means a changed layout.
    if len(annex1) < 300 or len(annex2) < 120:
        raise SystemExit(f"parsed only {len(annex1)} annex 1 and {len(annex2)} annex 2 entries; refusing to write")

    levels: dict[int, list[str]] = {}
    regions_for: dict[int, list[str] | None] = {}
    unmatched: list[str] = []
    # Names GBIF cannot match exactly are still tried against the catalogue's own names.
    by_name: list[dict] = []

    def add(key: int, level: str, counties: list[str] | None):
        levels.setdefault(key, []).append(level)
        if strongest(levels[key]) == level:
            regions_for[key] = counties

    for e in annex1:
        kingdom = "Animalia" if e["kind"] == "animal" else "Plantae"
        key = next((k for n in [e["name"], *e["synonyms"]] if (k := match_key(session, n, kingdom))), None)
        if key:
            add(key, "annex", None)
        else:
            unmatched.append(e["name"])
            by_name.append({"name": e["name"], "level": "annex", "regions": None})
    families = [r for r in annex2 if "family" in r]
    for r in annex2:
        if "name" not in r:
            continue
        key = None
        for kingdom in ("Animalia", "Plantae", "Fungi"):
            key = match_key(session, r["name"], kingdom)
            if key:
                break
        if key:
            add(key, r["level"], r["counties"])
        else:
            unmatched.append(r["name"])
            if r["counties"] is None:
                by_name.append({"name": r["name"], "level": r["level"], "regions": None})
    for r in families:
        for key in family_species_in_sweden(session, r["family"]):
            if key not in levels:  # "utom": a species listed on its own keeps its own level
                add(key, r["level"], r["counties"])

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("select id, name from public.regions where id like 'SWE.%'")
        region_id = {name: rid for rid, name in cur.fetchall()}
        rows = []
        for key, found in levels.items():
            counties = regions_for.get(key)
            ids = None
            if counties is not None:
                missing = [c for c in counties if c not in region_id]
                if missing:
                    raise SystemExit(f"unknown counties {missing}")
                ids = sorted(region_id[c] for c in counties)
            rows.append({"key": key, "level": strongest(found), "regions": ids})
        cur.execute("update public.species set protection = null, protection_regions = null")
        cur.execute("update public.species set legal_status = null where legal_status = 'protected'")
        cur.executemany(
            "update public.species set protection = %(level)s, protection_regions = %(regions)s "
            "where gbif_key = %(key)s",
            rows,
        )
        cur.executemany(
            "update public.species set protection = %(level)s, protection_regions = %(regions)s "
            "where scientific_name = %(name)s and protection is null",
            by_name,
        )
        # Every wild bird (4 §), unless the ordinance listed it with a level of its own.
        cur.execute("update public.species set protection = 'bird' where taxon_group = 'bird' and protection is null")
        # An invasive species keeps its invasive line (the Union list bans releasing it).
        cur.execute(
            "update public.species set legal_status = 'protected' "
            "where protection is not null and legal_status is null"
        )
        cur.execute(
            "select protection, count(*) from public.species where in_catalogue and legal_status = 'protected' "
            "group by 1 order by 1"
        )
        summary = cur.fetchall()
        conn.commit()
    print(f"Annex 1: {len(annex1)} entries; annex 2: {len(annex2)} rows; matched species: {len(levels)}")
    print(f"Not on the GBIF backbone as written ({len(unmatched)}): {', '.join(sorted(unmatched))}")
    print("Catalogue species marked protected: " + ", ".join(f"{p} {n}" for p, n in summary))
    return 0


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    sys.exit(main())
