-- 0018 — purchases become entitlements, granted only by the server (T-217).
--
-- `profiles.full_game` has been server-only since T-200 and the free-catch trigger honours it, but
-- nothing set it. Store purchases arrive as RevenueCat webhooks at the `revenuecat-webhook` Edge
-- Function, which calls `set_entitlement` with the service key. No client path writes here, so an
-- unlock cannot be self-granted.
--
-- `entitlements` keeps one row per (user, entitlement): full_game, family, all_regions, and
-- region_<county>. The latest event wins. RevenueCat retries and can deliver out of order, so a
-- change applies only if it is newer than the row it would replace. A replayed or late event
-- changes nothing.
--
-- `profiles.full_game` is derived from the rows, never set directly: Full Game or Family grants
-- it. Household members join that derivation in T-102.

create table if not exists public.entitlements (
  user_id     uuid not null references auth.users (id) on delete cascade,
  entitlement text not null,
  active      boolean not null,
  product_id  text,
  event_id    text not null,
  changed_at  timestamptz not null,
  primary key (user_id, entitlement)
);

alter table public.entitlements enable row level security;

-- Users can see what they own (it is part of their data export); they can never write it.
create policy "entitlements selectable by owner"
  on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.entitlements from anon, authenticated;

create or replace function public.refresh_full_game(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profiles (user_id, full_game)
  values (
    p_user,
    exists (
      select 1 from public.entitlements e
       where e.user_id = p_user and e.active and e.entitlement in ('full_game', 'family')
    )
  )
  on conflict (user_id) do update set full_game = excluded.full_game;
$$;

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
begin
  -- A purchase for an account that no longer exists (deleted, or expired by T-094) has no owner.
  -- Skipping it is right: the store keeps the purchase and a restore re-sends it.
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
  return case when applied = 1 then 'applied' else 'stale' end;
end;
$$;

revoke all on function public.refresh_full_game(uuid) from public, anon, authenticated;
revoke all on function public.set_entitlement(uuid, text, boolean, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.set_entitlement(uuid, text, boolean, timestamptz, text, text)
  to service_role;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).
