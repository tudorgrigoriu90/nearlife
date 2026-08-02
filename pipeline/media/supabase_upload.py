"""Re-host sourced species photos on Supabase Storage (T-119 load step).

Reads `pipeline/data/media_kronoberg.json` (from build_kronoberg_media.py), downloads each original
Wikimedia image, and uploads it to a public Supabase Storage bucket so the APP serves the photos
(never Wikimedia — per Commons' reuse guidance, and for reliability/perf/privacy). Idempotent:
re-runs upsert the same object keys. Files are stored UNMODIFIED (invariant #8); resize on delivery
via Supabase image transforms, not by editing the stored file.

Requires (server-side secrets — never in the client):
    SUPABASE_URL            e.g. https://<ref>.supabase.co
    SUPABASE_SERVICE_KEY    the service-role key (NOT the publishable key)

Run:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python pipeline/media/supabase_upload.py
"""

import json
import mimetypes
import os
import sys
from pathlib import Path

import requests

BUCKET = "species-media"
ROOT = Path(__file__).resolve().parent.parent.parent
MEDIA_JSON = ROOT / "pipeline" / "data" / "media_kronoberg.json"
UA = "nearby-nearlife-media/0.1 (https://github.com/tudorgrigoriu90/nearlife)"


def ensure_bucket(base: str, key: str) -> None:
    headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}
    resp = requests.post(
        f"{base}/storage/v1/bucket",
        headers=headers,
        json={"id": BUCKET, "name": BUCKET, "public": True},
        timeout=30,
    )
    if resp.status_code in (200, 201):
        print(f"created public bucket '{BUCKET}'")
    elif resp.status_code == 409 or "already exists" in resp.text.lower():
        print(f"bucket '{BUCKET}' already exists")
    else:
        resp.raise_for_status()


def upload_one(base: str, key: str, path: str, data: bytes, content_type: str) -> None:
    # x-upsert makes re-runs idempotent (overwrite the same key).
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": content_type,
        "x-upsert": "true",
        "cache-control": "public, max-age=31536000, immutable",
    }
    resp = requests.post(f"{base}/storage/v1/object/{BUCKET}/{path}", headers=headers, data=data, timeout=60)
    resp.raise_for_status()


def main() -> int:
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not base or not key:
        print("set SUPABASE_URL and SUPABASE_SERVICE_KEY (service-role) in the environment")
        return 2
    payload = json.loads(MEDIA_JSON.read_text(encoding="utf-8"))
    entries = [m for m in payload["media"] if m.get("imageUrl")]

    ensure_bucket(base, key)
    session = requests.Session()
    session.headers.update({"User-Agent": UA})

    ok = 0
    for i, m in enumerate(entries, 1):
        path = f"{m['speciesId']}.{m['ext']}"
        try:
            img = session.get(m["imageUrl"], timeout=60)
            img.raise_for_status()
            ctype = img.headers.get("Content-Type") or mimetypes.guess_type(path)[0] or "image/jpeg"
            upload_one(base, key, path, img.content, ctype)
            ok += 1
            print(f"  {i:>2}/{len(entries)} {path} ({len(img.content) // 1024} KB)", flush=True)
        except Exception as exc:
            print(f"  ! {m['speciesId']}: {exc}", flush=True)

    print(f"\nuploaded {ok}/{len(entries)} photos to {base}/storage/v1/object/public/{BUCKET}/")
    return 0 if ok == len(entries) else 1


if __name__ == "__main__":
    sys.exit(main())
