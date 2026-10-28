-- 0011 — push notifications: device tokens, send log, hourly schedule (T-201).
--
-- The engine (T-063) and per-user send slots (T-186) existed; nothing carried a decision to a
-- phone. This adds the three server-side pieces: where a device's FCM token lives, a log of what
-- was sent (the cadence caps are computed from it), and the pg_cron job that calls the
-- `send-notifications` Edge Function every hour.
--
-- Consent model: a `push_devices` row IS the opt-in. The app writes it only while the user's
-- notification consent is on and deletes the user's rows when it is withdrawn
-- (lib/pushRegistration.ts), so the sender needs no second flag that could disagree with it.

-- ── push_devices ────────────────────────────────────────────────────────────
-- Keyed (user_id, token), not token alone: after a reinstall the same phone can register under a
-- new anonymous account while the old row lingers, and a token-only key would make the new
-- account's upsert collide with a row RLS will not let it touch. The sender gives a shared token
-- to the newest registration only (lib/pushDispatch.ts `deliverableDevices`).
create table if not exists public.push_devices (
  user_id    uuid not null references auth.users (id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('android', 'ios')),
  locale     text,                                  -- UI locale for the notification text
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_devices enable row level security;

create policy "push_devices selectable by owner"
  on public.push_devices for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_devices insertable by owner"
  on public.push_devices for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "push_devices updatable by owner"
  on public.push_devices for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "push_devices deletable by owner"
  on public.push_devices for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── notification_log ────────────────────────────────────────────────────────
-- Written only by the Edge Function (service role bypasses RLS); users may read their own rows,
-- which also makes them part of the data export. Deleted with the account (cascade).
create table if not exists public.notification_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  species_id text not null,
  sent_at    timestamptz not null default now()
);

create index if not exists notification_log_user_sent_idx
  on public.notification_log (user_id, sent_at desc);

alter table public.notification_log enable row level security;

create policy "notification_log selectable by owner"
  on public.notification_log for select to authenticated
  using ((select auth.uid()) = user_id);

-- ── cron → Edge Function authentication ─────────────────────────────────────
-- The function is deployed with JWT verification off (pg_cron has no user JWT) and instead
-- requires an `x-cron-secret` header. The secret is generated here, lives only in Vault, and is
-- checked through a service-role-only function — so no human ever has to copy it anywhere.
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'push_cron_secret',
      'Shared secret pg_cron sends to the send-notifications Edge Function (T-201)'
    );
  end if;
end
$$;

create or replace function public.push_cron_secret_matches(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'push_cron_secret' and decrypted_secret = candidate
  );
$$;

revoke all on function public.push_cron_secret_matches(text) from public, anon, authenticated;
grant execute on function public.push_cron_secret_matches(text) to service_role;

-- ── hourly schedule ─────────────────────────────────────────────────────────
-- Hourly because send slots (T-186) spread users across the waking hours; at-or-after slot
-- matching means a missed cycle self-heals an hour later. Minute 7, not 0, to stay off the
-- top-of-hour rush. cron.schedule upserts by job name, so re-running this is safe.
select cron.schedule(
  'send-notifications',
  '7 * * * *',
  $cron$
  select net.http_post(
    url := 'https://subjdoiicfmiimtvlzsg.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- Verify after applying:
--   select jobname, schedule from cron.job;                          -- send-notifications, 7 * * * *
--   select count(*) from vault.secrets where name = 'push_cron_secret';  -- 1
--   select status_code, content from net._http_response order by created desc limit 5;
