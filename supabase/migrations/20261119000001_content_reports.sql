-- 0038 — "Report a mistake" on every card (T-293 · review I-32).
--
-- 10,000 species ship in 38 languages without per-species review (T-177): the noise filter and
-- the generators are the quality bar, so users need a way to say a name, photo, text or season is
-- wrong. A signed-in user may insert a report for themselves; nobody but the service role reads
-- the table (the weekly content-reports workflow lists new ones). At most 20 a day per account, so
-- the shipped publishable key cannot be used to flood it. Reports are personal data: they are in
-- the user's export, leave with the account, and expire after 365 days.

create table if not exists public.content_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species_id text not null references public.species (id) on update cascade on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2,3}$'),
  kind text not null check (kind in ('name', 'photo', 'text', 'season', 'other')),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists content_reports_created_idx on public.content_reports (created_at);
create index if not exists content_reports_user_idx on public.content_reports (user_id, created_at);

alter table public.content_reports enable row level security;

-- Insert only, and only the report's own fields: user_id comes from the session, never the client.
revoke all on public.content_reports from public, anon, authenticated;
grant insert (species_id, locale, kind, comment) on public.content_reports to authenticated;

drop policy if exists content_reports_insert_own on public.content_reports;
create policy content_reports_insert_own on public.content_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create or replace function public.limit_content_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.content_reports
       where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many_reports';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_content_reports() from public, anon, authenticated;

drop trigger if exists content_reports_daily_limit on public.content_reports;
create trigger content_reports_daily_limit
  before insert on public.content_reports
  for each row execute function public.limit_content_reports();

-- Expiry after 365 days. Guarded so the migration also applies where pg_cron is absent (the CI
-- test database); cron.schedule upserts by job name, so re-running this is safe.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'expire-content-reports', '23 4 * * *',
      $cron$ delete from public.content_reports where created_at < now() - interval '365 days' $cron$
    );
  end if;
end
$do$;

-- The export gains the user's own reports (privacy policy: the export holds everything we keep).
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
