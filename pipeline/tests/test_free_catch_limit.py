"""The free-catch limit is defined twice — the app shows it, the database enforces it (T-200).

The trigger is the authority, the app constant drives the UI. If they ever differ, the app either
offers a catch the server then refuses, or blocks one the user is entitled to. Neither language can
import the other, so this test reads both sources and pins them together.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase" / "migrations" / "20261029000001_free_catch_enforcement.sql"
APP = ROOT / "lib" / "freeCatch.ts"


def test_the_database_limit_equals_the_app_constant():
    app = re.search(r"FREE_CATCHES_PER_SEASON = (\d+)", APP.read_text(encoding="utf-8"))
    sql = re.search(r"if used >= (\d+) then", MIGRATION.read_text(encoding="utf-8"))
    assert app and sql, "constant or trigger check not found — update this test with the code"
    assert int(app.group(1)) == int(sql.group(1))


def test_users_cannot_write_the_counter_or_the_entitlement():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "revoke insert, update on public.profiles from anon, authenticated;" in sql
    grants = re.findall(r"grant (insert|update) \(([^)]*)\) on public\.profiles to authenticated;", sql)
    assert grants, "column grants missing"
    for _verb, columns in grants:
        cols = {c.strip() for c in columns.split(",")}
        assert not cols & {"free_catches_used", "free_catch_season", "full_game"}
