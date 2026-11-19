-- 0049 — the weekly recap in the send log (T-350 · review F-04).
--
-- A recap names no species, so species_id becomes optional for it alone. It is logged like any
-- send because the cadence caps (push_due_users, the daily cap) count every notification, and the
-- user's data export lists it.

alter table public.notification_log add column if not exists kind text not null default 'species';
alter table public.notification_log drop constraint if exists notification_log_kind_known;
alter table public.notification_log add constraint notification_log_kind_known
  check (kind in ('species', 'recap') and (kind = 'recap' or species_id is not null));
alter table public.notification_log alter column species_id drop not null;

-- Verify after applying: db-migrate.yml mode=verify (pipeline/db/verify.py, rolled back).
