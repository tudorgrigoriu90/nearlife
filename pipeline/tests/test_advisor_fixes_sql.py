"""Static guards on the advisor-fix migration (T-224): the owner-only rules must be exactly as
strict as before, only cheaper to evaluate."""

import re
from pathlib import Path

SQL = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261030000006_advisor_fixes.sql"
).read_text(encoding="utf-8")
CODE = "\n".join(line for line in SQL.splitlines() if not line.startswith("--"))
POLICIES = re.findall(r"create policy .*?;", CODE, flags=re.S)


def test_every_dropped_policy_is_recreated():
    dropped = set(re.findall(r'drop policy if exists "([^"]+)"', CODE))
    created = set(re.findall(r'create policy "([^"]+)"', CODE))
    assert dropped == created and len(created) == 7


def test_every_policy_is_owner_only_with_auth_uid_evaluated_once():
    for p in POLICIES:
        assert "to authenticated" in p, p
        checks = re.findall(r"(?:using|with check) \(([^;]*?)\)(?= with check|;|$)", p)
        assert checks, p
        for c in checks:
            assert c.strip() == "(select auth.uid()) = user_id", p
        assert "auth.uid() = user_id" not in p.replace("(select auth.uid()) = user_id", ""), p


def test_writes_keep_a_with_check():
    for p in POLICIES:
        if " for insert " in p or " for update " in p:
            assert "with check ((select auth.uid()) = user_id)" in p, p
