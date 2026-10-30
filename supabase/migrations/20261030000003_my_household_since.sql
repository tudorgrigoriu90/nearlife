-- 0023 — `my_household()` also says since when you are in it (T-219).
--
-- The data export (GDPR access/portability) must show the household link the server keeps for
-- an account. Members have no read path to the tables (T-102), so the function is the only
-- place they can learn their own join date. `since` is the household's creation for the owner,
-- and the member's own join for a member. Everything else is unchanged; CREATE OR REPLACE keeps
-- the existing grants.

create or replace function public.my_household()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select h.*, 'owner' as role, h.created_at as since from public.households h where h.owner_id = auth.uid()
    union all
    select h.*, 'member', m.joined_at from public.households h
      join public.household_members m on m.household_id = h.id
     where m.user_id = auth.uid()
  )
  select case when not exists (select 1 from mine) then null else (
    select jsonb_build_object(
      'role', mine.role,
      'since', mine.since,
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
