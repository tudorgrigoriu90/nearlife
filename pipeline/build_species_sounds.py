"""Give every catalogue bird a licence-clear recording of its song or call, hosted in Storage (T-245).

For each bird in data/catalogue.json (hybrids skipped: no one records "Mallard × Pintail" on
purpose) it asks iNaturalist for a research-grade observation carrying a CC0 / CC BY / CC BY-SA
sound (media/inat_sounds.py), cuts a 20 s mono AAC clip with ffmpeg, re-hosts it at
`species-media/sounds/<id>.m4a`, and records url + recordist + licence + source in
`public.species_sounds`. A bird with no safe recording is recorded with url null and not asked
again.

Resumable like the photo job: most-observed birds first, a time budget, and every species already
recorded is skipped, so a weekly run only picks up birds a catalogue refresh has added.

    SUPABASE_DB_URL=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
        python pipeline/build_species_sounds.py [--max-minutes 120]
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from build_species_photos import public_url  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "pipeline" / "data" / "catalogue.json"

UPSERT_SQL = (
    "insert into public.species_sounds (species_id, url, source_url, author, license) "
    "values (%(species_id)s, %(url)s, %(source_url)s, %(author)s, %(license)s) "
    "on conflict (species_id) do update set url = excluded.url, source_url = excluded.source_url, "
    "author = excluded.author, license = excluded.license, checked_at = now()"
)


def is_hybrid(scientific_name: str) -> bool:
    return " x " in f" {scientific_name.lower()} " or "×" in scientific_name


def sound_path(species_id: str) -> str:
    """`gbif:2490266` → `sounds/gbif-2490266.m4a` (a dash, as for photos, is safe in every URL)."""
    return f"sounds/{species_id.replace(':', '-')}.m4a"


def bird_targets(included: list[dict], id_by_gbif_key: dict[int, str], done_ids: set[str]) -> list[dict]:
    """Birds still to look up, most-observed first; hybrids, unknown and recorded species skipped."""
    targets = []
    for sp in sorted(included, key=lambda s: (-int(s.get("occurrences", 0)), int(s["speciesKey"]))):
        if sp.get("taxon") != "birds" or is_hybrid(sp["scientificName"]):
            continue
        species_id = id_by_gbif_key.get(int(sp["speciesKey"]))
        if species_id is None or species_id in done_ids:
            continue
        targets.append({"speciesId": species_id, "scientificName": sp["scientificName"]})
    return targets


def sound_row(species_id: str, found: dict | None, url: str | None) -> dict:
    """The species_sounds row for a lookup — a clip, or a recorded miss (url + licence null)."""
    if not (found and found.get("license") and url):
        return {"species_id": species_id, "url": None, "source_url": None, "author": None, "license": None}
    return {
        "species_id": species_id,
        "url": url,
        "source_url": found["sourceUrl"],
        "author": found.get("author") or "Unknown",
        "license": found["license"],
    }


def make_clip(raw: bytes) -> bytes:
    from media.inat_sounds import clip_args

    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp) / "in", Path(tmp) / "out.m4a"
        src.write_bytes(raw)
        subprocess.run(clip_args(str(src), str(dst)), check=True, timeout=120)
        return dst.read_bytes()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-minutes", type=float, default=120.0)
    args = parser.parse_args()

    dsn = os.environ.get("SUPABASE_DB_URL")
    base = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not (dsn and base and key):
        raise SystemExit("SUPABASE_DB_URL, SUPABASE_URL and SUPABASE_SERVICE_KEY are all required.")

    import psycopg
    import requests

    from media.inat_sounds import fetch_sound
    from media.inaturalist import INaturalistClient
    from media.supabase_upload import ensure_bucket, fetch_with_retry, upload_one

    deadline = time.monotonic() + args.max_minutes * 60
    included = json.loads(CATALOGUE.read_text(encoding="utf-8"))["included"]
    client = INaturalistClient()
    downloads = requests.Session()
    downloads.headers.update(client.session.headers)
    ensure_bucket(base, key)

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("select gbif_key, id from public.species where gbif_key is not null")
        id_by_key = {int(k): i for k, i in cur.fetchall()}
        cur.execute("select species_id from public.species_sounds")
        done = {r[0] for r in cur.fetchall()}
        targets = bird_targets(included, id_by_key, done)
        print(f"{len(done)} birds already recorded; {len(targets)} to look up", flush=True)

        clips = misses = 0
        for i, sp in enumerate(targets, 1):
            if time.monotonic() > deadline:
                print(f"time budget reached after {i - 1} birds — the next run resumes here", flush=True)
                break
            url = None
            found = None
            try:
                found = fetch_sound(client, sp["scientificName"])
                if found:
                    raw = fetch_with_retry(downloads, found["fileUrl"])
                    path = sound_path(sp["speciesId"])
                    upload_one(base, key, path, make_clip(raw.content), "audio/mp4")
                    url = public_url(base, path)
            except Exception as exc:  # one bird's failure must not end the run; it stays pending
                print(f"  ! {sp['scientificName']}: {exc}", flush=True)
                continue
            row = sound_row(sp["speciesId"], found, url)
            cur.execute(UPSERT_SQL, row)
            clips += row["url"] is not None
            misses += row["url"] is None
            if i % 25 == 0:
                conn.commit()
                print(f"  {i}/{len(targets)}: {clips} clips, {misses} without a usable recording", flush=True)
        conn.commit()

        cur.execute("select count(*) filter (where url is not null), count(*) from public.species_sounds")
        with_clip, recorded = cur.fetchone()
    print(f"\nthis run: {clips} clips, {misses} without a usable recording")
    print(f"species_sounds: {with_clip} with a clip of {recorded} recorded")
    return 0


if __name__ == "__main__":
    sys.exit(main())
