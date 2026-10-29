"""The retention windows are defined twice: the app policy and the job that applies it (T-094).

lib/retention.ts is what the privacy policy and the app describe. The pg_cron job in the migration
is what actually deletes. Neither can import the other, so this reads both and pins them together.
A drift would delete earlier than promised, which cannot be undone, or keep data longer than
promised.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# The latest definition of apply_retention (20261029000004 first, replaced by 20261029000007).
MIGRATION = ROOT / "supabase" / "migrations" / "20261029000007_retention_keeps_customers.sql"
APP = ROOT / "lib" / "retention.ts"


def _app(name: str) -> int:
    m = re.search(rf"{name}: (\d+),", APP.read_text(encoding="utf-8"))
    assert m, f"{name} not found in lib/retention.ts"
    return int(m.group(1))


def _sql(marker: str) -> int:
    m = re.search(rf"interval '(\d+) days'\s*-- {marker}", MIGRATION.read_text(encoding="utf-8"))
    assert m, f"interval tagged '-- {marker}' not found in the migration"
    return int(m.group(1))


def test_inactive_anonymous_window_matches_the_app_policy():
    assert _sql("inactiveAnonymousUserDays") == _app("inactiveAnonymousUserDays")


def test_notification_log_window_matches_the_app_policy():
    assert _sql("notificationLogDays") == _app("notificationLogDays")


def test_only_anonymous_accounts_are_ever_expired():
    # A linked email means the person chose to keep the account; only deletion from Settings
    # (T-093) may remove it.
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "u.is_anonymous" in sql


def test_every_activity_signal_is_considered():
    # last_sign_in_at does not move on a token refresh, so a daily user would look inactive.
    sql = MIGRATION.read_text(encoding="utf-8")
    for signal in ("auth.sessions", "auth.refresh_tokens", "public.collection", "public.push_devices"):
        assert signal in sql, f"{signal} is not used as an activity signal"


def test_the_job_is_not_callable_by_users():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "revoke all on function public.apply_retention(timestamptz) from public, anon, authenticated;" in sql


def test_a_paying_customer_is_never_expired():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "from public.entitlements e where e.user_id = u.id and e.active" in sql
