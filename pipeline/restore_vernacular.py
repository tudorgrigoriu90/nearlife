"""Resume vernacular names from the previous pipeline run's artifact (T-198).

build_vernacular.py is resumable within a run, but data/vernacular.json lives only in the run
artifact, so a retried run started from a clean checkout and re-fetched all 6,824 species (~52 min,
two GBIF calls each). This restores the newest earlier `pipeline-data` artifact's vernacular.json
before the fetch, which then only does what is still pending.

Only recent artifacts are used (MAX_AGE_DAYS). Resuming is for retries: the February refresh must
re-fetch, or build_vernacular would skip every species and ship last year's names indefinitely.

Never fails the job. Any problem (no token, no artifact, a corrupt zip) just means a full fetch,
which is what happened before this existed. The file is not committed on purpose: the database is
the durable store, and this is a 2 MB derived cache.

    GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo GITHUB_RUN_ID=... python pipeline/restore_vernacular.py
"""

import io
import json
import os
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent / "data" / "vernacular.json"
ARTIFACT_NAME = "pipeline-data"
MAX_AGE_DAYS = 30
API = "https://api.github.com"


def _created(artifact: dict) -> datetime:
    return datetime.strptime(artifact["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def pick_artifact(artifacts: list[dict], current_run_id: int, now: datetime) -> dict | None:
    """The newest unexpired `pipeline-data` artifact from another run, if recent enough."""
    usable = [
        a
        for a in artifacts
        if a.get("name") == ARTIFACT_NAME
        and not a.get("expired")
        and (a.get("workflow_run") or {}).get("id") != current_run_id
        and (now - _created(a)).days < MAX_AGE_DAYS
    ]
    return max(usable, key=_created, default=None)


def is_valid_vernacular(payload: object) -> bool:
    """The shape build_vernacular.py writes: {"names": {"<gbif key>": {locale: name, ...}}}."""
    if not isinstance(payload, dict) or not isinstance(payload.get("names"), dict):
        return False
    return all(key.isdigit() and isinstance(entry, dict) for key, entry in payload["names"].items())


def vernacular_from_zip(blob: bytes) -> dict | None:
    """vernacular.json from an artifact zip, or None. Reads that one top-level member and
    extracts nothing to disk, so a downloaded archive's paths are never trusted."""
    try:
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            if "vernacular.json" not in zf.namelist():
                return None
            payload = json.loads(zf.read("vernacular.json").decode("utf-8"))
    except (zipfile.BadZipFile, ValueError):
        return None
    return payload if is_valid_vernacular(payload) else None


def main() -> int:
    if OUT.exists():
        print("data/vernacular.json already present — nothing to restore")
        return 0
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    run_id = int(os.environ.get("GITHUB_RUN_ID") or 0)
    if not (token and repo):
        print("no GITHUB_TOKEN / GITHUB_REPOSITORY — skipping restore; names will be fetched in full")
        return 0

    import requests

    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
    try:
        res = session.get(
            f"{API}/repos/{repo}/actions/artifacts",
            params={"name": ARTIFACT_NAME, "per_page": 100},
            timeout=30,
        )
        res.raise_for_status()
        chosen = pick_artifact(res.json().get("artifacts", []), run_id, datetime.now(timezone.utc))
        if chosen is None:
            print(f"no {ARTIFACT_NAME} artifact from the last {MAX_AGE_DAYS} days — names will be fetched in full")
            return 0
        blob = session.get(chosen["archive_download_url"], timeout=120)
        blob.raise_for_status()
    except requests.RequestException as exc:
        print(f"restore skipped ({exc}) — names will be fetched in full")
        return 0

    payload = vernacular_from_zip(blob.content)
    source = f"run {chosen['workflow_run']['id']} ({chosen['created_at']})"
    if payload is None:
        print(f"{source} has no usable vernacular.json — names will be fetched in full")
        return 0
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"restored {len(payload['names']):,} species' names from {source}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
