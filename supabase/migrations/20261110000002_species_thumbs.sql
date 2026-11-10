-- 0029 — compact thumbnails for offline use (T-255).
--
-- Full Game owners can keep their county on the phone (T-256). The card photo (~400 px JPEG,
-- 30–80 KB) would make that 150+ MB, so the pipeline also makes a 200 px WebP at quality 40
-- (~4.5 KB; still clearly the species at card size). `thumb_source` is the photo the thumbnail was
-- made from: when the photo changes, the two differ and the thumbnail job rebuilds it.

alter table public.species_media add column if not exists thumb_url text;
alter table public.species_media add column if not exists thumb_source text;
