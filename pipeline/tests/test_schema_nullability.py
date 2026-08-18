"""The rows the loader builds must satisfy the schema it loads into (T-196).

T-187 changed `common_name` from a copy of the binomial to NULL, so the app could render a
scientific name *as* one instead of passing it off as a common name. The reasoning was right and
the change was tested — but the test asserted the value was None without knowing
`species.common_name` is `not null`. The load then failed in production after a 52-minute run:

    NotNullViolation: null value in column "common_name" of relation "species"

Unit tests on a row builder cannot see a database constraint, and a live DB is not available here.
But the schema **is in the repo**, so the constraint can be read from the migration and checked
against the rows — which is enough to catch exactly this class of mistake at the point it is made.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.db_rows import build_rows  # noqa: E402

MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def not_null_columns(table: str) -> set[str]:
    """Columns declared `not null` for a table, read from the checked-in migrations.

    Later migrations may relax a constraint (`drop not null`), so those are honoured too — the
    answer has to reflect the schema as it ends up, not as it was first written.
    """
    required: set[str] = set()
    for path in sorted(MIGRATIONS.glob("*.sql")):
        sql = path.read_text(encoding="utf-8")
        block = re.search(
            rf"create table if not exists public\.{table}\s*\((.*?)\n\);", sql, re.S
        )
        if block:
            for line in block.group(1).splitlines():
                line = line.split("--")[0].strip().rstrip(",")
                if not line or line.startswith(("primary key", "unique", "constraint", "foreign")):
                    continue
                lowered = line.lower()
                # `primary key` implies NOT NULL in Postgres without saying so; missing that would
                # make the check blind to the column most likely to be wrong.
                if "not null" in lowered or "primary key" in lowered:
                    required.add(line.split()[0])
        for relaxed in re.findall(
            rf"alter table public\.{table}\s+alter column (\w+) drop not null", sql, re.I
        ):
            required.discard(relaxed)
    return required


def _rec(county, key, name, months, occ):
    return {
        "county": county,
        "countyName": county,
        "speciesKey": key,
        "scientificName": name,
        "activeMonths": months,
        "occurrences": occ,
    }


def test_the_migration_is_actually_parsed():
    # A regex that silently matched nothing would make every assertion below vacuously pass.
    required = not_null_columns("species")
    assert "id" in required and "scientific_name" in required


def test_species_rows_never_null_a_not_null_column():
    species_rows, _ = build_rows([("birds", [_rec("SWE.9_1", 1, "Pica pica", [5], 10)])])
    required = not_null_columns("species")
    for row in species_rows:
        for column in required:
            if column in row:
                assert row[column] is not None, f"species.{column} is not null but the loader sends None"


def test_presence_rows_never_null_a_not_null_column():
    _, presence_rows = build_rows([("birds", [_rec("SWE.9_1", 1, "Pica pica", [5], 10)])])
    required = not_null_columns("species_presence")
    for row in presence_rows:
        for column in required:
            if column in row:
                assert row[column] is not None, f"species_presence.{column} is not null but None was sent"


def test_a_relaxed_constraint_is_honoured():
    # species_content.fact was made nullable by a later migration (T-146); the parser must not
    # keep reporting it as required, or this check would block the very design it is protecting.
    assert "fact" not in not_null_columns("species_content")
