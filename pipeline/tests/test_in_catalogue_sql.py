"""T-225: the migration's initial in_catalogue fill uses the same thresholds as the noise filter,
and presence is readable only for catalogue species."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.noise import DEFAULT_POLICY  # noqa: E402

SQL = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261031000001_species_in_catalogue.sql"
).read_text(encoding="utf-8")


def _threshold(name: str) -> int:
    m = re.search(rf"(\d+)\s*\)*\s*--\s*{name}", SQL)
    assert m, name
    return int(m.group(1))


def test_sql_thresholds_match_the_python_policy():
    assert _threshold("abundant_occurrences") == DEFAULT_POLICY.abundant_occurrences
    assert _threshold("min_occurrences") == DEFAULT_POLICY.min_occurrences
    assert _threshold("min_counties") == DEFAULT_POLICY.min_counties
    assert _threshold("local_occurrences") == DEFAULT_POLICY.local_occurrences


def test_presence_is_readable_only_for_catalogue_species():
    assert 'drop policy if exists "species_presence public read"' in SQL
    assert "using (exists (select 1 from public.species s where s.id = species_id and s.in_catalogue))" in SQL
    assert "using (true)" not in SQL
