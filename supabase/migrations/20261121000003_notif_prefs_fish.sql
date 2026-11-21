-- 0053 — fish is a notification group of its own (T-389).
--
-- Until now fish were inside "other" (with amphibians, reptiles, spiders and snails). The check
-- accepts 'fish' (the list matches PREF_GROUPS in lib/notifPrefs.ts, __tests__/notifPrefsParity),
-- and a stored choice that included "other" gets "fish" too, once, so nobody stops hearing about
-- fish because of the split. Done here rather than when reading the choice: on every read it would
-- turn fish back on for someone who later switched it off.

create or replace function public.notif_prefs_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and not exists (select 1 from jsonb_object_keys(p) k where k not in ('frequency', 'window', 'groups'))
    and (not p ? 'frequency' or p->>'frequency' in ('daily', 'everyOtherDay', 'weekly'))
    and (not p ? 'window' or jsonb_typeof(p->'window') = 'null' or p->>'window' in ('morning', 'midday', 'evening'))
    and (not p ? 'groups' or jsonb_typeof(p->'groups') = 'null' or (
      jsonb_typeof(p->'groups') = 'array'
      and jsonb_array_length(p->'groups') > 0
      and not exists (
        select 1 from jsonb_array_elements(p->'groups') g
         where jsonb_typeof(g) <> 'string' or g #>> '{}' not in ('bird', 'mammal', 'fish', 'insect', 'plant', 'other')
      )
    ))
$$;

update public.profiles
   set notif_prefs = jsonb_set(notif_prefs, '{groups}', (notif_prefs->'groups') || '["fish"]'::jsonb)
 where jsonb_typeof(notif_prefs->'groups') = 'array'
   and notif_prefs->'groups' ? 'other'
   and not notif_prefs->'groups' ? 'fish';
