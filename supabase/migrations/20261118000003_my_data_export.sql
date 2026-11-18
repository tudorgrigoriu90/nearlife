-- 0036 — everything the server keeps about a user, for the data export (T-280 · review B-18).
--
-- The privacy policy says "the export holds everything we keep for your account". The app read
-- only purchases and the household; the notification history, the push devices, the account
-- counters and the reviewer-code redemption were missing, and the last is not readable by users at
-- all. This one function returns every section for the signed-in user only. A device token is
-- shown by its last 6 characters: enough to recognise, useless to anyone else.

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
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_data_export() from public, anon;
grant execute on function public.my_data_export() to authenticated;
