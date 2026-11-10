"""The catalogue cleanup migration (T-254): static checks; db/verify.py proves it live."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.noise import EXCLUDED_TAXA  # noqa: E402

SQL = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261110000001_catalogue_cleanup.sql"
).read_text()


def test_the_migration_excludes_exactly_what_the_loader_excludes():
    # Two copies of one rule: if they drifted, the next load would undo part of this migration.
    listed = set(re.findall(r"^\s+'([A-Z][a-z]+ [a-z-]+)'[,)]", SQL, re.MULTILINE))
    assert listed == set(EXCLUDED_TAXA)


def test_hybrids_leave_the_catalogue_as_the_loader_says():
    assert r"scientific_name ~* '\sx\s'" in SQL and "like '%×%'" in SQL


def test_users_keep_their_collection_when_duplicates_merge():
    for tier in ("spotted_at", "caught_at", "helped_at"):
        assert re.search(rf"{tier}\s+= least\(c\.{tier}, d\.{tier}\)", SQL)
    assert "update public.collection set species_id = r.curated where species_id = dup" in SQL


def test_the_three_curated_birds_go_to_the_real_species():
    for curated, key in (("mallard", 9761484), ("blue-tit", 2487879), ("whooper-swan", 2498347)):
        assert f"('{curated}', {key}::bigint" in SQL


def test_a_photo_taken_back_goes_on_to_inaturalist():
    assert "sources_tried = '{wikipedia}'" in SQL
