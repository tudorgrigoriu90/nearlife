-- 0037 — limits a client cannot get around (T-286 · review B-48, B-50).
--
-- B-48: `collection.species_id` took any text, of any length, as many rows as a client liked, and
-- anonymous sign-in plus the publishable key that ships in the app is all it takes. A collection
-- row now has to name a real species (foreign key; the catalogue clean-up re-keys species ids, so
-- the key follows an id change and a deleted species takes its rows with it), and an account holds
-- at most 20,000 rows (the catalogue is ~16,000 species).
--
-- B-50: removing a Family member left the invite code unchanged, so they could rejoin with it.
-- The owner can now rotate the code, and removing a member rotates it.

alter table public.collection drop constraint if exists collection_species_fk;
alter table public.collection
  add constraint collection_species_fk foreign key (species_id)
  references public.species (id) on update cascade on delete cascade;

create or replace function public.limit_collection_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.collection where user_id = new.user_id) >= 20000 then
    raise exception 'collection_full';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_collection_rows() from public, anon, authenticated;

drop trigger if exists collection_row_limit on public.collection;
create trigger collection_row_limit
  before insert on public.collection
  for each row execute function public.limit_collection_rows();

-- ── Family invite codes ─────────────────────────────────────────────────────
create or replace function public.rotate_household_code()
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
  if not exists (select 1 from public.households where owner_id = me) then
    raise exception 'not_owner';
  end if;
  loop
    code := public.new_invite_code();
    begin
      update public.households set invite_code = code where owner_id = me;
      return code;
    exception when unique_violation then
      -- a code collision: draw again
    end;
  end loop;
end;
$$;
revoke all on function public.rotate_household_code() from public, anon;
grant execute on function public.rotate_household_code() to authenticated;

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
  -- The removed member, and anyone the old code was forwarded to, cannot rejoin with it.
  perform public.rotate_household_code();
end;
$$;
