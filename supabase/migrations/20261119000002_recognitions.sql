-- 0039 — species recognised in the "I saw…" quiz, kept with the account (T-299 · review B-31).
--
-- Recognitions earn the "recognised" badges and lived only on the phone, so a reinstall lost them
-- while spotted badges came back after sign-in. Each user reads and adds only their own rows; a
-- species is recognised once (the first time is kept); only real species (the foreign key bounds
-- the rows per account by the catalogue's size). They leave with the account and are in the export.

create table if not exists public.recognitions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species_id text not null references public.species (id) on update cascade on delete cascade,
  recognized_at timestamptz not null default now(),
  primary key (user_id, species_id)
);

alter table public.recognitions enable row level security;

revoke all on public.recognitions from public, anon, authenticated;
grant select on public.recognitions to authenticated;
grant insert (species_id) on public.recognitions to authenticated;

drop policy if exists recognitions_read_own on public.recognitions;
create policy recognitions_read_own on public.recognitions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists recognitions_add_own on public.recognitions;
create policy recognitions_add_own on public.recognitions
  for insert to authenticated with check (user_id = (select auth.uid()));

-- The export gains the user's recognitions.
create or replace function public.my_data_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  return jsonb_build_object(
    'account', (
      select jsonb_build_object(
        'homeRegion', p.home_region,
        'freeCatchesUsed', p.free_catches_used,
        'freeCatchSeason', p.free_catch_season,
        'fullGame', p.full_game,
        'createdAt', p.created_at
      ) from public.profiles p where p.user_id = me
    ),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('speciesId', n.species_id, 'sentAt', n.sent_at)
                       order by n.sent_at)
        from public.notification_log n where n.user_id = me
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
               'platform', d.platform, 'locale', d.locale, 'tokenEnd', right(d.token, 6),
               'registeredAt', d.created_at, 'updatedAt', d.updated_at)
             order by d.created_at)
        from public.push_devices d where d.user_id = me
    ), '[]'::jsonb),
    'reviewerCodes', coalesce((
      select jsonb_agg(jsonb_build_object('redeemedAt', r.redeemed_at) order by r.redeemed_at)
        from public.reviewer_redemptions r where r.user_id = me
    ), '[]'::jsonb),
    'recognitions', coalesce((
      select jsonb_agg(jsonb_build_object('speciesId', r.species_id, 'recognizedAt', r.recognized_at)
             order by r.recognized_at)
        from public.recognitions r where r.user_id = me
    ), '[]'::jsonb),
    'contentReports', coalesce((
      select jsonb_agg(jsonb_build_object(
               'speciesId', c.species_id, 'locale', c.locale, 'kind', c.kind,
               'comment', c.comment, 'sentAt', c.created_at)
             order by c.created_at)
        from public.content_reports c where c.user_id = me
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_data_export() from public, anon;
grant execute on function public.my_data_export() to authenticated;
