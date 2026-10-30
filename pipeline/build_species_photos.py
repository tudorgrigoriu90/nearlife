"""Give every catalogue species a licence-clear hero photo, hosted in Storage (T-202).

For each of the 6,824 shipped species (data/catalogue.json) it asks Wikipedia for the article's lead
image, keeps it only if the licence is commercial-safe (CC0 / CC BY / CC BY-SA, invariant #8),
re-hosts the ~400 px thumbnail in the `species-media` bucket, and records url + author + licence +
source page in `public.species_media`.

A species Wikipedia has no usable photo for then gets one look on iNaturalist (T-220), whose
community photos cover many of the insects Wikipedia misses. Only CC0 / CC BY / CC BY-SA photos
ship from either source. `sources_tried` records which sources a miss has been through, so neither
is asked twice.

Resumable by design. Polite pacing makes the full catalogue ~6 hours — longer than one Actions job
can run — so it works most-observed species first (the ones people actually meet), stops at a time
budget, and the next run skips every species already recorded, including those recorded as having
no usable photo (url null). The curated 54 are seeded from their existing manifest first: they
already have hand-checked photos in Storage, which a generic lead-image pass would overwrite.

    SUPABASE_DB_URL=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
        python pipeline/build_species_photos.py [--max-minutes 330]
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from media.licenses import app_license  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "pipeline" / "data" / "catalogue.json"
CURATED_MEDIA = ROOT / "pipeline" / "data" / "media_kronoberg.json"
BUCKET = "species-media"

UPSERT_SQL = (
    "insert into public.species_media (species_id, url, source_url, author, license, sources_tried) "
    "values (%(species_id)s, %(url)s, %(source_url)s, %(author)s, %(license)s, '{wikipedia}') "
    "on conflict (species_id) do update set url = excluded.url, source_url = excluded.source_url, "
    "author = excluded.author, license = excluded.license, checked_at = now(), "
    "sources_tried = excluded.sources_tried"
)

SECOND_SOURCE = "inaturalist"

# A hit fills the row; a miss only records that the source was tried. `url is null` keeps a photo
# already chosen (or a curated one) from ever being replaced by a later source.
SECOND_SOURCE_SQL = (
    "update public.species_media set url = %(url)s, source_url = %(source_url)s, author = %(author)s, "
    "license = %(license)s, checked_at = now(), sources_tried = array_append(sources_tried, %(source)s) "
    "where species_id = %(species_id)s and url is null"
)

# The curated 54 are seeded, never overwritten: their hand-checked photos win over a lead image.
CURATED_SQL = (
    "insert into public.species_media (species_id, url, source_url, author, license) "
    "values (%(species_id)s, %(url)s, %(source_url)s, %(author)s, %(license)s) "
    "on conflict (species_id) do nothing"
)


def storage_path(species_id: str) -> str:
    """`gbif:2490266` → `gbif-2490266.jpg`. Colons are legal in Storage keys but not in every
    client or URL path segment that will ever touch them; a dash is safe everywhere."""
    return f"{species_id.replace(':', '-')}.jpg"


def public_url(base: str, path: str) -> str:
    return f"{base.rstrip('/')}/storage/v1/object/public/{BUCKET}/{path}"


def pending_targets(
    included: list[dict],
    id_by_gbif_key: dict[int, str],
    done_ids: set[str],
) -> list[dict]:
    """Catalogue species still to look up, most-observed first. Skips species the database does
    not hold (nothing to attach a photo to) and every species already recorded."""
    targets = []
    for sp in sorted(included, key=lambda s: (-int(s.get("occurrences", 0)), int(s["speciesKey"]))):
        species_id = id_by_gbif_key.get(int(sp["speciesKey"]))
        if species_id is None or species_id in done_ids:
            continue
        targets.append({"speciesId": species_id, "scientificName": sp["scientificName"]})
    return targets


def second_source_targets(rows: list[tuple], source: str) -> list[dict]:
    """Misses `source` has not looked at yet, most-observed first.

    rows: (species_id, scientific_name, occurrences, url, sources_tried)."""
    pending = [r for r in rows if r[3] is None and source not in (r[4] or [])]
    pending.sort(key=lambda r: (-int(r[2] or 0), r[0]))
    return [{"speciesId": r[0], "scientificName": r[1]} for r in pending]


def media_row(species_id: str, found: dict | None, url: str | None) -> dict:
    """The species_media row for a lookup — a photo, or a recorded miss (url + licence null)."""
    licence = app_license(found.get("license")) if found else None
    if not (found and licence and url):
        return {"species_id": species_id, "url": None, "source_url": None, "author": None, "license": None}
    return {
        "species_id": species_id,
        "url": url,
        "source_url": found.get("sourceUrl"),
        "author": found.get("author") or "Unknown",
        "license": licence,
    }


def curated_rows(manifest: dict, base: str) -> list[dict]:
    """Rows for the curated 54 from their existing manifest — their photos are already hosted."""
    rows = []
    for m in manifest["media"]:
        if not m.get("imageUrl") or not m.get("appLicense"):
            continue
        rows.append(
            {
                "species_id": m["speciesId"],
                "url": public_url(base, f"{m['speciesId']}.{m.get('ext') or 'jpg'}"),
                "source_url": m.get("sourceUrl"),
                "author": m.get("author") or "Unknown",
                "license": m["appLicense"],
            }
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-minutes", type=float, default=330.0)
    args = parser.parse_args()

    dsn = os.environ.get("SUPABASE_DB_URL")
    base = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not (dsn and base and key):
        raise SystemExit("SUPABASE_DB_URL, SUPABASE_URL and SUPABASE_SERVICE_KEY are all required.")

    import psycopg
    import requests

    from media.supabase_upload import ensure_bucket, fetch_with_retry, upload_one
    from media.wikimedia import WikimediaClient

    deadline = time.monotonic() + args.max_minutes * 60
    included = json.loads(CATALOGUE.read_text(encoding="utf-8"))["included"]
    client = WikimediaClient()
    downloads = requests.Session()
    downloads.headers.update(client.session.headers)
    ensure_bucket(base, key)

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("select id from public.species")
        known = {r[0] for r in cur.fetchall()}
        cur.executemany(
            CURATED_SQL,
            [r for r in curated_rows(json.loads(CURATED_MEDIA.read_text(encoding="utf-8")), base) if r["species_id"] in known],
        )
        conn.commit()

        cur.execute("select gbif_key, id from public.species where gbif_key is not null")
        id_by_key = {int(k): i for k, i in cur.fetchall()}
        cur.execute("select species_id from public.species_media")
        done = {r[0] for r in cur.fetchall()}
        targets = pending_targets(included, id_by_key, done)
        print(f"{len(done)} species already recorded; {len(targets)} to look up", flush=True)

        photos = misses = 0
        for i, sp in enumerate(targets, 1):
            if time.monotonic() > deadline:
                print(f"time budget reached after {i - 1} species — the next run resumes here", flush=True)
                break
            url = None
            found = None
            try:
                found = client.fetch_image(sp["scientificName"])
                if found and app_license(found.get("license")):
                    img = fetch_with_retry(downloads, found["imageUrl"])
                    path = storage_path(sp["speciesId"])
                    upload_one(base, key, path, img.content, img.headers.get("Content-Type") or "image/jpeg")
                    url = public_url(base, path)
            except Exception as exc:  # one species' failure must not end the run; it stays pending
                print(f"  ! {sp['scientificName']}: {exc}", flush=True)
                continue
            row = media_row(sp["speciesId"], found, url)
            cur.execute(UPSERT_SQL, row)
            photos += row["url"] is not None
            misses += row["url"] is None
            if i % 25 == 0:
                conn.commit()  # progress survives a timeout or a cancelled job
                print(f"  {i}/{len(targets)}: {photos} photos, {misses} without a usable photo", flush=True)
        conn.commit()

        # Second source (T-220): the misses, most-observed first, within the same time budget.
        from media.inaturalist import INaturalistClient

        inat = INaturalistClient()
        by_key = {int(sp["speciesKey"]): sp for sp in included}
        cur.execute(
            "select m.species_id, s.gbif_key, m.url, m.sources_tried "
            "from public.species_media m join public.species s on s.id = m.species_id"
        )
        rows = []
        for species_id, gbif_key, url, tried in cur.fetchall():
            sp = by_key.get(int(gbif_key)) if gbif_key is not None else None
            if sp is not None:
                rows.append((species_id, sp["scientificName"], sp.get("occurrences", 0), url, tried))
        second = second_source_targets(rows, SECOND_SOURCE)
        print(f"\n{SECOND_SOURCE}: {len(second)} species without a photo to look up", flush=True)
        found_2 = missed_2 = 0
        for i, sp in enumerate(second, 1):
            if time.monotonic() > deadline:
                print(f"time budget reached after {i - 1} species — the next run resumes here", flush=True)
                break
            url = None
            found = None
            try:
                found = inat.fetch_image(sp["scientificName"])
                if found:
                    img = fetch_with_retry(downloads, found["imageUrl"])
                    path = storage_path(sp["speciesId"])
                    upload_one(base, key, path, img.content, img.headers.get("Content-Type") or "image/jpeg")
                    url = public_url(base, path)
            except Exception as exc:  # stays pending for the next run
                print(f"  ! {sp['scientificName']}: {exc}", flush=True)
                continue
            # found["license"] is already in the app form (CC0 / CC-BY / CC-BY-SA).
            ok = bool(found and url)
            cur.execute(
                SECOND_SOURCE_SQL,
                {
                    "species_id": sp["speciesId"],
                    "url": url if ok else None,
                    "source_url": found["sourceUrl"] if ok else None,
                    "author": (found["author"] or "Unknown") if ok else None,
                    "license": found["license"] if ok else None,
                    "source": SECOND_SOURCE,
                },
            )
            found_2 += ok
            missed_2 += not ok
            if i % 25 == 0:
                conn.commit()
                print(f"  {i}/{len(second)}: {found_2} photos, {missed_2} without a usable photo", flush=True)
        conn.commit()
        print(f"{SECOND_SOURCE} this run: {found_2} photos, {missed_2} without a usable photo")

        cur.execute("select count(*) filter (where url is not null), count(*) from public.species_media")
        with_photo, recorded = cur.fetchone()
    print(f"\nthis run: {photos} photos, {misses} without a usable photo")
    print(f"species_media: {with_photo} with a photo of {recorded} recorded; catalogue {len(included)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
