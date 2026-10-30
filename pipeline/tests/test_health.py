"""T-100: the daily health check turns silent failures into a red run (and GitHub's email)."""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.health import EXPECTED_JOBS, Facts, Job, problems  # noqa: E402

NOW = datetime(2026, 10, 31, 7, 0, tzinfo=timezone.utc)
COUNTIES = {f"SWE.{n}_1" for n in range(1, 22)}


def healthy(**over) -> Facts:
    base = dict(
        now=NOW,
        jobs={
            "send-notifications": Job("succeeded", NOW - timedelta(minutes=53), NOW - timedelta(minutes=53)),
            "apply-retention": Job("succeeded", NOW - timedelta(hours=3), NOW - timedelta(hours=3)),
        },
        http_statuses=[200, 200, 200],
        counties=COUNTIES,
        counties_with_spots=COUNTIES,
    )
    base.update(over)
    return Facts(**base)


def test_a_healthy_project_has_no_problems():
    assert problems(healthy()) == []


def test_both_cron_jobs_are_watched():
    assert set(EXPECTED_JOBS) == {"send-notifications", "apply-retention"}


def test_a_missing_cron_job_is_a_problem():
    jobs = dict(healthy().jobs)
    del jobs["send-notifications"]
    assert any("send-notifications" in p and "not scheduled" in p for p in problems(healthy(jobs=jobs)))


def test_a_failed_last_run_is_a_problem():
    jobs = dict(healthy().jobs)
    jobs["apply-retention"] = Job("failed", NOW - timedelta(hours=3), NOW - timedelta(days=1, hours=3))
    assert any("apply-retention" in p and "failed" in p for p in problems(healthy(jobs=jobs)))


def test_notifications_that_stopped_running_are_a_problem():
    jobs = dict(healthy().jobs)
    stale = NOW - timedelta(hours=5)
    jobs["send-notifications"] = Job("succeeded", stale, stale)
    assert any("send-notifications" in p and "no successful run" in p for p in problems(healthy(jobs=jobs)))


def test_the_notification_function_answering_with_errors_is_a_problem():
    # The cron "succeeds" as soon as pg_net queues the call; the function's own answer is separate.
    found = problems(healthy(http_statuses=[200, 500, None, 401]))
    assert any("3 of 4" in p for p in found)


def test_a_county_without_catch_spots_is_a_problem():
    found = problems(healthy(counties_with_spots=COUNTIES - {"SWE.10_1"}))
    assert any("SWE.10_1" in p for p in found)


def test_no_counties_at_all_is_a_problem():
    assert any("no Swedish county" in p for p in problems(healthy(counties=set(), counties_with_spots=set())))
