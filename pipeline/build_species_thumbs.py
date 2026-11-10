"""Compact thumbnails of every species photo, for the offline county pack (T-255).

Each photo in `species_media` (our own Storage copy, ~400 px) becomes a 200 px WebP at quality 40,
about 4.5 KB, stored at `species-media/thumbs/<id>.webp`. A full county is then ~12 MB of photos
instead of 150+ MB. ffmpeg does the encoding, as it does for bird sounds, so no image library is
added.

Resumable and self-healing: it works on rows whose thumbnail is missing or was made from a photo
that has since changed (`thumb_source` differs from `source_url`), until a time budget.

    SUPABASE_DB_URL=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
        python pipeline/build_species_thumbs.py [--max-minutes 60]
"""

import argparse
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from build_species_photos import public_url  # noqa: E402

THUMB_WIDTH = 200
THUMB_QUALITY = 40

PENDING_SQL = (
    "select species_id, url, source_url from public.species_media "
    "where url is not null and (thumb_url is null or thumb_source is distinct from source_url) "
    "order by species_id"
)
RECORD_SQL = (
    "update public.species_media set thumb_url = %(thumb_url)s, thumb_source = %(thumb_source)s "
    "where species_id = %(species_id)s"
)


def thumb_path(species_id: str) -> str:
    """`gbif:2490266` → `thumbs/gbif-2490266.webp` (a dash, as for photos, is safe in every URL)."""
    return f"thumbs/{species_id.replace(':', '-')}.webp"


def thumb_args(src: str, dst: str) -> list[str]:
    """ffmpeg: at most 200 px wide (never upscaled), WebP quality 40, smallest-file effort."""
    return [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", src,
        "-vf", f"scale='min({THUMB_WIDTH},iw)':-2",
        "-frames:v", "1",
        "-c:v", "libwebp", "-quality", str(THUMB_QUALITY), "-compression_level", "6",
        dst,
    ]


def make_thumb(image: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp) / "in", Path(tmp) / "out.webp"
        src.write_bytes(image)
        subprocess.run(thumb_args(str(src), str(dst)), check=True, timeout=60)
        return dst.read_bytes()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-minutes", type=float, default=60.0)
    args = parser.parse_args()

    dsn = os.environ.get("SUPABASE_DB_URL")
    base = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not (dsn and base and key):
        raise SystemExit("SUPABASE_DB_URL, SUPABASE_URL and SUPABASE_SERVICE_KEY are all required.")

    import psycopg
    import requests

    from media.supabase_upload import fetch_with_retry, upload_one

    deadline = time.monotonic() + args.max_minutes * 60
    session = requests.Session()
    made = failed = total_bytes = 0
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(PENDING_SQL)
        pending = cur.fetchall()
        print(f"{len(pending)} thumbnails to make", flush=True)
        for i, (species_id, url, source_url) in enumerate(pending, 1):
            if time.monotonic() > deadline:
                print(f"time budget reached after {i - 1} — the next run resumes here", flush=True)
                break
            try:
                thumb = make_thumb(fetch_with_retry(session, url).content)
                path = thumb_path(species_id)
                upload_one(base, key, path, thumb, "image/webp")
            except Exception as exc:  # one photo's failure must not end the run; it stays pending
                print(f"  ! {species_id}: {exc}", flush=True)
                failed += 1
                continue
            cur.execute(
                RECORD_SQL,
                {"species_id": species_id, "thumb_url": public_url(base, path), "thumb_source": source_url},
            )
            made += 1
            total_bytes += len(thumb)
            if i % 100 == 0:
                conn.commit()
                print(f"  {i}/{len(pending)}: {made} made, avg {total_bytes // max(made, 1)} bytes", flush=True)
        conn.commit()
    print(f"\nthis run: {made} thumbnails (avg {total_bytes // max(made, 1)} bytes), {failed} failed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
