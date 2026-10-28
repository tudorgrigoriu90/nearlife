"""T-198: a retried pipeline run resumes vernacular names from the previous run's artifact."""

import io
import json
import sys
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from restore_vernacular import (  # noqa: E402
    ARTIFACT_NAME,
    MAX_AGE_DAYS,
    is_valid_vernacular,
    pick_artifact,
    vernacular_from_zip,
)

NOW = datetime(2026, 10, 28, 20, 0, tzinfo=timezone.utc)


def artifact(art_id, run_id, days_old, expired=False, name=ARTIFACT_NAME):
    created = (NOW - timedelta(days=days_old)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "id": art_id,
        "name": name,
        "expired": expired,
        "created_at": created,
        "workflow_run": {"id": run_id},
    }


def zipped(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, body in files.items():
            zf.writestr(name, body)
    return buf.getvalue()


GOOD = {"meta": {}, "names": {"9705453": {"en": "Great Tit", "sv": "talgoxe", "_realms": ["terrestrial"]}}}


# --- pick_artifact ---------------------------------------------------------------------------


def test_picks_the_newest_usable_artifact():
    arts = [artifact(1, 10, days_old=5), artifact(2, 11, days_old=1), artifact(3, 12, days_old=3)]
    assert pick_artifact(arts, current_run_id=99, now=NOW)["id"] == 2


def test_never_picks_the_current_run():
    arts = [artifact(1, 99, days_old=0), artifact(2, 11, days_old=2)]
    assert pick_artifact(arts, current_run_id=99, now=NOW)["id"] == 2


def test_skips_expired_and_other_names():
    arts = [artifact(1, 10, days_old=1, expired=True), artifact(2, 11, days_old=1, name="other")]
    assert pick_artifact(arts, current_run_id=99, now=NOW) is None


def test_too_old_is_not_resumed_so_the_annual_refresh_fetches_fresh_names():
    # Resuming exists for retries. A year-old file would make the February refresh skip every
    # species and ship last year's names forever.
    arts = [artifact(1, 10, days_old=MAX_AGE_DAYS + 1)]
    assert pick_artifact(arts, current_run_id=99, now=NOW) is None
    assert pick_artifact([artifact(1, 10, days_old=MAX_AGE_DAYS - 1)], current_run_id=99, now=NOW)["id"] == 1


def test_no_artifacts():
    assert pick_artifact([], current_run_id=99, now=NOW) is None


# --- vernacular_from_zip ---------------------------------------------------------------------


def test_reads_vernacular_from_the_artifact_zip():
    blob = zipped({"vernacular.json": json.dumps(GOOD), "catalogue.json": "{}"})
    assert vernacular_from_zip(blob) == GOOD


def test_artifact_without_vernacular_gives_nothing():
    # A run that skipped the name fetch uploads an artifact with no vernacular.json.
    assert vernacular_from_zip(zipped({"catalogue.json": "{}"})) is None


def test_only_the_top_level_member_is_read():
    # Never trust a nested path from a downloaded archive.
    assert vernacular_from_zip(zipped({"x/vernacular.json": json.dumps(GOOD)})) is None


def test_corrupt_zip_or_json_gives_nothing():
    assert vernacular_from_zip(b"not a zip") is None
    assert vernacular_from_zip(zipped({"vernacular.json": "{broken"})) is None


def test_invalid_shape_gives_nothing():
    assert vernacular_from_zip(zipped({"vernacular.json": json.dumps({"names": []})})) is None


# --- is_valid_vernacular ---------------------------------------------------------------------


def test_valid_shape():
    assert is_valid_vernacular(GOOD)
    assert is_valid_vernacular({"names": {}})


def test_invalid_shapes():
    assert not is_valid_vernacular([])
    assert not is_valid_vernacular({"meta": {}})
    assert not is_valid_vernacular({"names": {"1": "Great Tit"}})
    assert not is_valid_vernacular({"names": {"not-a-key": {"en": "x"}}})


# --- the workflow wiring ---------------------------------------------------------------------


def test_workflow_restores_before_fetching_and_may_read_artifacts():
    workflow = (Path(__file__).resolve().parents[2] / ".github" / "workflows" / "data-pipeline.yml").read_text()
    restore = workflow.index("python pipeline/restore_vernacular.py")
    assert restore < workflow.index("python pipeline/build_vernacular.py")
    assert restore < workflow.index("python pipeline/build_content.py")
    assert "actions: read" in workflow
