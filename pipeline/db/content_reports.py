"""The week's "Report a mistake" reports, for whoever fixes content (T-293 · review I-32).

Users may insert reports but never read them; this lists the last N days of them, grouped by
species, most reported first, into the workflow's job summary. Read-only.

Comments are user text shown in Markdown: pipes are escaped, line breaks folded and angle brackets
dropped, so a comment can neither break the table nor inject HTML, and each is shortened.

    SUPABASE_DB_URL=... python -m db.content_reports        (from pipeline/)
"""

import os
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

COMMENT_CHARS = 160

REPORTS_SQL = """
select r.species_id, coalesce(c.common_name, s.common_name, s.scientific_name), r.kind, r.locale,
       r.comment, r.created_at
  from public.content_reports r
  join public.species s on s.id = r.species_id
  left join public.species_content c on c.species_id = r.species_id and c.locale = r.locale
 where r.created_at > now() - make_interval(days => %s)
 order by r.created_at
"""


@dataclass(frozen=True)
class Report:
    species_id: str
    name: str | None
    kind: str
    locale: str
    comment: str | None
    created_at: datetime


def _cell(text: str | None, limit: int = COMMENT_CHARS) -> str:
    if not text:
        return ""
    flat = " ".join(text.split()).replace("<", "").replace(">", "").replace("|", "\\|")
    return flat if len(flat) <= limit else flat[: limit - 1] + "…"


def summarise(reports: list[Report], days: int) -> str:
    if not reports:
        return f"No reports in the last {days} days.\n"
    by_species: dict[str, list[Report]] = defaultdict(list)
    for rep in reports:
        by_species[rep.species_id].append(rep)
    lines = [
        f"## {len(reports)} reports in the last {days} days, {len(by_species)} species",
        "",
        "| Species | Kind | Language | When (UTC) | Comment |",
        "|---|---|---|---|---|",
    ]
    for species_id, reps in sorted(by_species.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        for rep in reps:
            label = f"{_cell(rep.name, 60)} (`{species_id}`)"
            when = rep.created_at.strftime("%Y-%m-%d %H:%M")
            lines.append(f"| {label} | {rep.kind} | {rep.locale} | {when} | {_cell(rep.comment)} |")
    return "\n".join(lines) + "\n"


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set.")
    days = int(os.environ.get("REPORT_DAYS") or 7)
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(REPORTS_SQL, (days,))
        reports = [Report(*row) for row in cur.fetchall()]
    text = summarise(reports, days)
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
