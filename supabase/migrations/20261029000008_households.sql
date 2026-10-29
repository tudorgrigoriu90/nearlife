-- 0020 — Family households: one purchase unlocks the Full Game for up to 5 people (T-102).
--
-- Google Play does not share one-time in-app purchases with a family group, so the household is
-- ours. Whoever holds the `family` entitlement (granted only by the RevenueCat webhook, T-217) can
-- create a household and share its invite code. Each person who joins with the code gets the Full
-- Game on their own account and keeps their own collection; a shared almanac is v2 (T-104).
--
-- Every membership change goes through a SECURITY DEFINER function. Users have no write path to
-- the tables, so the 5-person cap, the "owner must still hold Family" rule and the entitlement
-- derivation cannot be bypassed. A member's full_game is derived (refresh_full_game), never
-- stored as a grant: when the owner's Family is refunded or the owner deletes their account, every
-- member loses it automatically.

create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

-- One household per person. The owner is not a row here; the 5-person cap counts owner + members.
create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
revoke all on public.households, public.household_members from anon, authenticated;
-- No policies and no grants: reads go through my_household(), writes through the functions below.

-- ── entitlement derivation ──────────────────────────────────────────────────
-- Replaces T-217's version: Full Game also comes from membership of a household whose owner still
-- holds Family. Update-first, and insert only for a user that still exists, because this also runs
-- while an account is being deleted (the member-row trigger below fires inside that cascade).
create or replace function public.refresh_full_game(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owns boolean;
begin
  owns := exists (
            select 1 from public.entitlements e
             where e.user_id = p_user and e.active and e.entitlement in ('full_game', 'family')
          )
          or exists (
            select 1
              from public.household_members m
              join public.households h on h.id = m.household_id
              join public.entitlements e on e.user_id = h.owner_id
             where m.user_id = p_user and e.entitlement = 'family' and e.active
          );
  update public.profiles set full_game = owns where user_id = p_user;
  if not found and exists (select 1 from auth.users where id = p_user) then
    insert into public.profiles (user_id, full_game) values (p_user, owns)
    on conflict (user_id) do update set full_game = excluded.full_game;
  end if;
end;
$$;

-- When an owner's Family changes (bought, refunded, transferred), their members follow.
create or replace function public.set_entitlement(
  p_user uuid,
  p_entitlement text,
  p_active boolean,
  p_at timestamptz,
  p_product text,
  p_event text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  applied integer;
  member uuid;
begin
  if not exists (select 1 from auth.users where id = p_user) then
    return 'unknown_user';
  end if;

  insert into public.entitlements as e (user_id, entitlement, active, product_id, event_id, changed_at)
  values (p_user, p_entitlement, p_active, p_product, p_event, p_at)
  on conflict (user_id, entitlement) do update
     set active = excluded.active,
         product_id = excluded.product_id,
         event_id = excluded.event_id,
         changed_at = excluded.changed_at
   where e.changed_at < excluded.changed_at;
  get diagnostics applied = row_count;

  perform public.refresh_full_game(p_user);
  if p_entitlement = 'family' then
    for member in
      select m.user_id from public.household_members m
        join public.households h on h.id = m.household_id
       where h.owner_id = p_user
    loop
      perform public.refresh_full_game(member);
    end loop;
  end if;
  return case when applied = 1 then 'applied' else 'stale' end;
end;
$$;

-- A member who leaves, is removed, or whose household goes away with its owner loses the unlock.
create or replace function public.household_member_gone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_full_game(old.user_id);
  return old;
end;
$$;

drop trigger if exists household_member_gone on public.household_members;
create trigger household_member_gone
  after delete on public.household_members
  for each row execute function public.household_member_gone();

-- ── invite codes ────────────────────────────────────────────────────────────
-- 8 characters from a 32-symbol alphabet without look-alikes (no 0/O, 1/I): ~10^12 codes, read
-- aloud or typed easily. Random bytes come from gen_random_uuid() (a v4 UUID, from the server's
-- cryptographic RNG), using only bytes that carry no version or variant bits.
create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := uuid_send(gen_random_uuid());
  picks constant int[] := array[0, 1, 2, 3, 4, 5, 10, 11];
  code text := '';
  i int;
begin
  foreach i in array picks loop
    code := code || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- ── the user-facing functions ───────────────────────────────────────────────
-- Errors carry a stable marker the app maps to a message: family_required, household_not_found,
-- household_full, already_in_household, household_inactive, not_owner.

create or replace function public.create_household()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  code text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not exists (
    select 1 from public.entitlements where user_id = me and entitlement = 'family' and active
  ) then
    raise exception 'family_required';
  end if;
  select invite_code into code from public.households where owner_id = me;
  if code is not null then return code; end if;  -- idempotent: one household per owner
  if exists (select 1 from public.household_members where user_id = me) then
    raise exception 'already_in_household';
  end if;
  loop
    code := public.new_invite_code();
    begin
      insert into public.households (owner_id, invite_code) values (me, code);
      return code;
    exception when unique_violation then
      if exists (select 1 from public.households where owner_id = me) then
        return (select invite_code from public.households where owner_id = me);
      end if;
      -- otherwise a code collision: draw again
    end;
  end loop;
end;
$$;

create or replace function public.join_household(code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  hh public.households%rowtype;
  people integer;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  -- FOR UPDATE: two people joining at once cannot both take the last seat.
  select * into hh from public.households where invite_code = upper(trim(code)) for update;
  if not found then raise exception 'household_not_found'; end if;
  if hh.owner_id = me or exists (select 1 from public.household_members where user_id = me) then
    raise exception 'already_in_household';
  end if;
  if exists (select 1 from public.households where owner_id = me) then
    raise exception 'already_in_household';
  end if;
  if not exists (
    select 1 from public.entitlements where user_id = hh.owner_id and entitlement = 'family' and active
  ) then
    raise exception 'household_inactive';
  end if;
  select 1 + count(*) into people from public.household_members where household_id = hh.id;
  if people >= 5 then raise exception 'household_full'; end if;  -- FAMILY_MAX_PEOPLE

  insert into public.household_members (household_id, user_id) values (hh.id, me);
  perform public.refresh_full_game(me);
end;
$$;

create or replace function public.leave_household()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.household_members where user_id = auth.uid();
$$;

create or replace function public.remove_household_member(member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.household_members m
   using public.households h
   where h.id = m.household_id and h.owner_id = auth.uid() and m.user_id = member;
  if not found then raise exception 'not_owner'; end if;
end;
$$;

-- What the Family screen needs, and nothing more. A member sees the household's size, not who is
-- in it; the owner also sees the code and each member's opaque id (to remove one) and join date.
create or replace function public.my_household()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select h.*, 'owner' as role from public.households h where h.owner_id = auth.uid()
    union all
    select h.*, 'member' from public.households h
      join public.household_members m on m.household_id = h.id
     where m.user_id = auth.uid()
  )
  select case when not exists (select 1 from mine) then null else (
    select jsonb_build_object(
      'role', mine.role,
      'people', 1 + (select count(*) from public.household_members m where m.household_id = mine.id),
      'active', exists (
        select 1 from public.entitlements e
         where e.user_id = mine.owner_id and e.entitlement = 'family' and e.active
      ),
      'invite_code', case when mine.role = 'owner' then mine.invite_code end,
      'members', case when mine.role = 'owner' then coalesce((
        select jsonb_agg(jsonb_build_object('id', m.user_id, 'joined_at', m.joined_at) order by m.joined_at)
          from public.household_members m where m.household_id = mine.id
      ), '[]'::jsonb) end
    ) from mine limit 1
  ) end
$$;

revoke all on function public.new_invite_code() from public, anon, authenticated;
revoke all on function public.household_member_gone() from public, anon, authenticated;
revoke all on function public.refresh_full_game(uuid) from public, anon, authenticated;
revoke all on function public.set_entitlement(uuid, text, boolean, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.set_entitlement(uuid, text, boolean, timestamptz, text, text)
  to service_role;

revoke all on function public.create_household() from public, anon;
revoke all on function public.join_household(text) from public, anon;
revoke all on function public.leave_household() from public, anon;
revoke all on function public.remove_household_member(uuid) from public, anon;
revoke all on function public.my_household() from public, anon;
grant execute on function public.create_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
grant execute on function public.my_household() to authenticated;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).
