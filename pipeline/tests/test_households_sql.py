"""Static guards on the households migration (T-102). The behaviour is proven live by
pipeline/db/verify.py; these catch a regression in review, before anything is applied."""

from pathlib import Path

SQL = (Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261029000008_households.sql").read_text(
    encoding="utf-8"
)


def test_users_have_no_direct_access_to_the_tables():
    assert "revoke all on public.households, public.household_members from anon, authenticated;" in SQL
    assert "create policy" not in SQL


def test_the_cap_is_five_people_counting_the_owner():
    assert "select 1 + count(*) into people" in SQL
    assert "if people >= 5 then raise exception 'household_full'" in SQL


def test_the_last_seat_is_locked_while_joining():
    assert "where invite_code = upper(trim(code)) for update" in SQL


def test_set_entitlement_stays_service_role_only_after_being_replaced():
    assert "grant execute on function public.set_entitlement(uuid, text, boolean, timestamptz, text, text)\n  to service_role;" in SQL
    assert "revoke all on function public.set_entitlement" in SQL
