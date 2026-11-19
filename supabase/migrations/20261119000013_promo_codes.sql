-- 0050 — gift and promo codes (T-356 · review F-19).
--
-- Reviewer codes (T-237) become general access codes for schools, libraries and the press: each
-- code now names what it grants. Existing codes keep granting the Full Game and every county (the
-- column's default). Budget, expiry, hashing and the purchase path (set_entitlement) are as before.
--
-- A code may grant only what the app sells to one person: the Full Game, every county, or one
-- county pack. Family is left out on purpose: it makes the redeemer a household owner who can add
-- five more accounts, which is a decision per household, not per code.

alter table public.reviewer_codes
  add column if not exists grants text[] not null default array['full_game', 'all_regions'];

alter table public.reviewer_codes drop constraint if exists reviewer_codes_grants_valid;
alter table public.reviewer_codes
  add constraint reviewer_codes_grants_valid check (
    cardinality(grants) between 1 and 3
    and array_to_string(grants, ',') ~ '^(full_game|all_regions|region_SWE_[0-9]+_1)(,(full_game|all_regions|region_SWE_[0-9]+_1))*$'
  );

create or replace function public.redeem_reviewer_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := (select auth.uid());
  h      text;
  g      text;
  wanted text[];
begin
  if uid is null or p_code is null then
    return false;
  end if;
  h := encode(extensions.digest(regexp_replace(upper(p_code), '[^A-Z0-9]', '', 'g'), 'sha256'), 'hex');

  if exists (select 1 from public.reviewer_redemptions where user_id = uid and code_hash = h) then
    return true;
  end if;

  update public.reviewer_codes
     set uses_left = uses_left - 1
   where code_hash = h and uses_left > 0 and expires_at > now()
  returning grants into wanted;
  if not found then
    return false;
  end if;

  insert into public.reviewer_redemptions (user_id, code_hash) values (uid, h);
  foreach g in array wanted loop
    perform public.set_entitlement(uid, g, true, now(), 'reviewer_code', 'reviewer:' || h);
  end loop;
  return true;
end;
$$;

revoke all on function public.redeem_reviewer_code(text) from public, anon;
grant execute on function public.redeem_reviewer_code(text) to authenticated;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).
