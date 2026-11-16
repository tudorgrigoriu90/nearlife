-- 0033 — a RevenueCat TRANSFER moves purchases to the new account (T-267 · review B-02).
--
-- RevenueCat sends TRANSFER when a purchase is restored into another app user id: a reinstall or
-- a new phone gives a new anonymous Supabase account, and "Restore purchases" moves the purchase
-- to it. The event carries only `transferred_from` and `transferred_to`: no entitlement list, no
-- product. So what moves is what the old accounts hold, which only the database knows.
--
-- Every active store entitlement of each source account is revoked there and granted to each
-- destination through set_entitlement (newest event wins, Full Game and household members
-- refreshed). A reviewer-code grant is not a store purchase and stays where it is. A Family
-- owner's household moves to the first destination, so its members keep the Full Game, unless
-- that account already owns or belongs to a household.
--
-- When no destination account exists nothing is revoked: a purchase is never taken away without
-- landing somewhere.

create or replace function public.transfer_entitlements(
  p_from uuid[],
  p_to uuid[],
  p_at timestamptz,
  p_event text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  dest uuid[];
  src uuid;
  d uuid;
  e record;
  moved integer := 0;
begin
  select coalesce(array_agg(u.id), '{}') into dest
    from auth.users u where u.id = any (p_to);
  if cardinality(dest) = 0 then
    return 'unknown_user';
  end if;

  foreach src in array p_from loop
    continue when src = any (dest);
    for e in
      select x.entitlement, x.product_id from public.entitlements x
       where x.user_id = src and x.active and x.product_id is distinct from 'reviewer_code'
    loop
      foreach d in array dest loop
        perform public.set_entitlement(d, e.entitlement, true, p_at, e.product_id, p_event);
      end loop;
      if e.entitlement = 'family'
         and not exists (select 1 from public.households where owner_id = dest[1])
         and not exists (select 1 from public.household_members where user_id = dest[1]) then
        update public.households set owner_id = dest[1] where owner_id = src;
        perform public.refresh_full_game(m.user_id)
           from public.household_members m
           join public.households h on h.id = m.household_id
          where h.owner_id = dest[1];
      end if;
      perform public.set_entitlement(src, e.entitlement, false, p_at, e.product_id, p_event);
      moved := moved + 1;
    end loop;
  end loop;
  return 'moved:' || moved;
end;
$$;

revoke all on function public.transfer_entitlements(uuid[], uuid[], timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.transfer_entitlements(uuid[], uuid[], timestamptz, text)
  to service_role;
