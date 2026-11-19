"""A fixed-size random sample of shipped content for a human check (T-294 · review I-33).

Content for 10,000 species in 38 languages is generated with no per-species review (T-177). After
every data-pipeline run this writes a review sheet: 30 random catalogue species in the five most
read languages, every field the card shows, plus automatic flags, and two empty columns for the
reviewer ("correct" Y/N and a note). The error rate of a marked sheet goes into the task plan.

Automatic flags:
  - honesty: a real-time presence phrase from the app's own list (lib/contentHonesty.ts, parsed
    here so there is one list);
  - a fact not in the row's script (an Arabic row holding English text: a translation that
    silently fell back);
  - no name, no fact (allowed, but noted), a fact without its source, no photo, no give/protect.

    SUPABASE_DB_URL=... python pipeline/content_sample.py [--seed S] [--species 30]
"""

import argparse
import csv
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "data" / "content_sample.csv"

# Swedish and English first; then the three largest immigrant languages the app is read in.
SAMPLE_LOCALES = ["sv", "en", "ar", "fa", "so"]

# Locales whose text is not in Latin script: a mostly-Latin fact there was not translated.
NON_LATIN = {"ar", "fa", "ps", "ckb", "ti", "am", "th", "ru", "uk", "sr", "bg", "el"}

COLUMNS = [
    "species_id", "scientific_name", "locale", "common_name", "fact", "fact_source_url",
    "fact_origin", "when_how", "give", "protect", "photo_url", "auto_flags", "correct",
    "reviewer_note",
]

SAMPLE_SQL = """
with picked as (
  select s.id from public.species s
   where s.in_catalogue
   order by md5(s.id || %(seed)s)
   limit %(n)s
)
select s.id, s.scientific_name, c.locale, c.common_name, c.fact, c.fact_source_url, c.fact_origin,
       c.when_how, c.give, c.protect, m.url
  from picked p
  join public.species s on s.id = p.id
  join public.species_content c on c.species_id = s.id and c.locale = any(%(locales)s)
  left join public.species_media m on m.species_id = s.id
 order by s.id, array_position(%(locales)s, c.locale)
"""


@dataclass(frozen=True)
class SampleRow:
    species_id: str
    scientific_name: str
    locale: str
    common_name: str | None
    fact: str | None
    fact_source_url: str | None
    fact_origin: str | None
    when_how: str | None
    give: str | None
    protect: str | None
    photo_url: str | None


def load_claim_phrases(ts_path: Path) -> dict[str, list[str]]:
    """REALTIME_CLAIM_PHRASES from the app's honesty module, one entry per locale."""
    source = ts_path.read_text(encoding="utf-8")
    block = source[source.index("REALTIME_CLAIM_PHRASES") : source.index("};")]
    out: dict[str, list[str]] = {}
    for loc, items in re.findall(r"^\s+([a-z]{2,3}): \[(.*?)\],?\s*$", block, re.M):
        out[loc] = re.findall(r"'([^']*)'", items)
    return out


def _latin_share(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c.isascii()) / len(letters)


def flags(row: SampleRow, phrases: dict[str, list[str]]) -> list[str]:
    found: list[str] = []
    texts = [row.common_name, row.fact, row.when_how, row.give, row.protect]
    lowered = " ".join(t for t in texts if t).lower()
    for phrase in phrases.get(row.locale, []):
        if phrase.lower() in lowered:
            found.append(f"honesty: '{phrase}'")
    if row.locale in NON_LATIN and row.fact and _latin_share(row.fact) > 0.5:
        found.append("fact not in the row's script")
    if not row.common_name:
        found.append("no name")
    if not row.fact:
        found.append("no fact")
    elif not row.fact_source_url:
        found.append("fact without source")
    if not row.photo_url:
        found.append("no photo")
    if not row.give:
        found.append("no give text")
    if not row.protect:
        found.append("no protect text")
    return found


def write_csv(rows: list[SampleRow], phrases: dict[str, list[str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for r in rows:
            w.writerow({**asdict(r), "auto_flags": "; ".join(flags(r, phrases)), "correct": "", "reviewer_note": ""})


def summary(rows: list[SampleRow], phrases: dict[str, list[str]]) -> str:
    counts: dict[str, int] = {}
    flagged = 0
    for r in rows:
        fs = flags(r, phrases)
        flagged += bool(fs)
        for f in fs:
            key = f.split(":")[0] if f.startswith("honesty") else f
            counts[key] = counts.get(key, 0) + 1
    lines = [f"{len(rows)} rows, {flagged} flagged automatically"]
    lines += [f"  {k}: {v}" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])]
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", default=os.environ.get("GITHUB_RUN_ID", "local"))
    ap.add_argument("--species", type=int, default=30)
    args = ap.parse_args()
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL is required.")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(SAMPLE_SQL, {"seed": str(args.seed), "n": args.species, "locales": SAMPLE_LOCALES})
        rows = [SampleRow(*r) for r in cur.fetchall()]
    phrases = load_claim_phrases(ROOT / "lib" / "contentHonesty.ts")
    write_csv(rows, phrases, OUT)
    text = summary(rows, phrases)
    print(f"seed {args.seed}: {args.species} species x {len(SAMPLE_LOCALES)} languages -> {OUT}\n{text}")
    report = os.environ.get("GITHUB_STEP_SUMMARY")
    if report:
        with open(report, "a", encoding="utf-8") as f:
            f.write(f"## Content QA sample (seed {args.seed})\n\n```\n{text}\n```\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
