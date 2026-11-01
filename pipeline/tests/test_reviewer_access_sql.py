"""The reviewer-access migration (T-237): static checks; db/verify.py proves it live.

A leaked code would unlock paid content for anyone, so the repository must hold only its hash, and
only signed-in users may call the redeem function. The unlock must go through set_entitlement, the
purchase path, so every paid gate treats a reviewer like a buyer.
"""

import re
from pathlib import Path

SQL = (Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261101000001_reviewer_access.sql").read_text()


def test_only_a_hash_of_the_code_is_stored():
    assert not re.search(r"NEARBY-[A-Z0-9]{4}", SQL)
    assert re.search(r"'[0-9a-f]{64}'", SQL)


def test_input_is_normalised_then_hashed():
    assert "regexp_replace(upper(p_code), '[^A-Z0-9]', '', 'g')" in SQL
    assert "extensions.digest(" in SQL and "'sha256'" in SQL


def test_unlock_goes_through_the_purchase_path():
    assert "public.set_entitlement(uid, 'full_game'" in SQL
    assert "public.set_entitlement(uid, 'all_regions'" in SQL


def test_only_signed_in_users_can_redeem_and_no_client_can_read_codes():
    assert "revoke all on function public.redeem_reviewer_code(text) from public, anon;" in SQL
    assert "grant execute on function public.redeem_reviewer_code(text) to authenticated;" in SQL
    assert "revoke all on public.reviewer_codes from anon, authenticated;" in SQL
    assert "security definer" in SQL and "set search_path = ''" in SQL
