-- 0026 — reviewer access codes (T-237).
--
-- Google Play reviewers must reach every part of the app but cannot buy anything, and the app has
-- no username/password to hand them. A reviewer enters a code (Settings → Access code); the server
-- grants that account the Full Game and All of Sweden through set_entitlement, the same path a
-- real purchase takes, so every gate (free-catch trigger, county access) behaves as for a buyer.
--
-- Only a SHA-256 hash of each code is stored, never the code. Codes are normalised before
-- hashing (upper case, letters and digits only) so "nearby-p6lu…" and "NEARBY P6LU…" both work.
-- A code has a use budget and an expiry, and is high-entropy (60 bits), so guessing is hopeless.
-- Redeeming twice on one account is a no-op that still answers true.

create table if not exists public.reviewer_codes (
  code_hash  text primary key,
  label      text not null,
  uses_left  integer not null check (uses_left >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviewer_redemptions (
  user_id     uuid not null references auth.users (id) on delete cascade,
  code_hash   text not null references public.reviewer_codes (code_hash) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (user_id, code_hash)
);

-- Neither table is readable or writable by any client; only the function below touches them.
alter table public.reviewer_codes enable row level security;
alter table public.reviewer_redemptions enable row level security;
revoke all on public.reviewer_codes from anon, authenticated;
revoke all on public.reviewer_redemptions from anon, authenticated;

create or replace function public.redeem_reviewer_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h   text;
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
   where code_hash = h and uses_left > 0 and expires_at > now();
  if not found then
    return false;
  end if;

  insert into public.reviewer_redemptions (user_id, code_hash) values (uid, h);
  perform public.set_entitlement(uid, 'full_game', true, now(), 'reviewer_code', 'reviewer:' || h);
  perform public.set_entitlement(uid, 'all_regions', true, now(), 'reviewer_code', 'reviewer:' || h);
  return true;
end;
$$;

revoke all on function public.redeem_reviewer_code(text) from public, anon;
grant execute on function public.redeem_reviewer_code(text) to authenticated;

-- The Play review code (the code itself is given to the Director, never stored in the repo).
-- 25 uses covers repeated reviews of updates; it expires before the next annual review cycle.
insert into public.reviewer_codes (code_hash, label, uses_left, expires_at)
values ('f0dfd4476e4a4c363fb010c6351a3133e8985afc27f26f784abe931b35a49cb3',
        'Google Play review 2026-27', 25, '2027-12-31T23:59:59Z')
on conflict (code_hash) do nothing;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).
