"""Daily health check of the live project (T-100). Read-only.

Things that fail silently, each of which the app would only show as "nothing happens":

  * the notification cron stopped, or its last run failed;
  * the notification Edge Function answers pg_net with errors (the cron run still "succeeds",
    because pg_net only queues the call);
  * the retention cron stopped (personal data would outlive its stated window, PRIVACY §3);
  * a Swedish county has no visible catch spots (catching there degrades to "unmapped").

Any problem fails the run, and GitHub emails the repository owner about a failed scheduled
workflow. That email is the alert: no extra service, no cost (invariant #7).

    SUPABASE_DB_URL=... python -m db.health        (from pipeline/)
"""

import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta

# Job name → the longest gap since its last successful run before it counts as stopped.
EXPECTED_JOBS: dict[str, timedelta] = {
    "send-notifications": timedelta(hours=3),  # hourly; two missed runs is a pattern, not noise
    "apply-retention": timedelta(hours=26),  # daily at 03:41 UTC, plus slack
}


@dataclass(frozen=True)
class Job:
    last_status: str | None
    last_start: datetime | None
    last_success: datetime | None


@dataclass(frozen=True)
class Facts:
    now: datetime
    jobs: dict[str, Job]
    http_statuses: list[int | None]  # pg_net responses kept by the database (about 6 hours)
    counties: set[str]  # Swedish counties with species presence
    counties_with_spots: set[str]  # counties with at least one visible (unflagged) catch spot


def problems(f: Facts) -> list[str]:
    found: list[str] = []
    for name, max_gap in EXPECTED_JOBS.items():
        job = f.jobs.get(name)
        if job is None:
            found.append(f"cron job {name} is not scheduled")
            continue
        if job.last_status not in (None, "succeeded"):
            found.append(f"cron job {name}: last run {job.last_status} at {job.last_start}")
        if job.last_success is None or f.now - job.last_success > max_gap:
            found.append(f"cron job {name}: no successful run since {job.last_success} (allowed gap {max_gap})")

    bad = [s for s in f.http_statuses if s is None or s >= 400]
    if bad:
        shown = ", ".join("timeout" if s is None else str(s) for s in bad[:5])
        found.append(f"notification function: {len(bad)} of {len(f.http_statuses)} recent calls failed ({shown})")

    if not f.counties:
        found.append("no Swedish county has species presence")
    missing = sorted(f.counties - f.counties_with_spots)
    if missing:
        found.append(f"no visible catch spots in {len(missing)} county(ies): {', '.join(missing)}")
    return found


def gather(cur, now: datetime) -> Facts:
    jobs: dict[str, Job] = {}
    cur.execute(
        "select j.jobname, "
        " (select status from cron.job_run_details r where r.jobid = j.jobid order by start_time desc limit 1), "
        " (select start_time from cron.job_run_details r where r.jobid = j.jobid order by start_time desc limit 1), "
        " (select max(start_time) from cron.job_run_details r where r.jobid = j.jobid and status = 'succeeded') "
        "from cron.job j"
    )
    for name, status, start, success in cur.fetchall():
        jobs[name] = Job(status, start, success)

    cur.execute("select status_code from net._http_response where created > now() - interval '6 hours'")
    statuses = [r[0] for r in cur.fetchall()]

    cur.execute("select distinct region_id from public.species_presence where region_id like 'SWE.%'")
    counties = {r[0] for r in cur.fetchall()}
    cur.execute("select distinct region_id from public.catch_spots where cardinality(flags) = 0")
    with_spots = {r[0] for r in cur.fetchall()}
    return Facts(now, jobs, statuses, counties, with_spots)


def main() -> int:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set (privileged Postgres connection string).")
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("select now()")
        facts = gather(cur, cur.fetchone()[0])

    for name, job in sorted(facts.jobs.items()):
        print(f"cron {name}: last {job.last_status} at {job.last_start}; last success {job.last_success}")
    print(f"notification calls (6 h): {len(facts.http_statuses)}")
    print(f"counties: {len(facts.counties)} with presence, {len(facts.counties_with_spots)} with catch spots")
    found = problems(facts)
    for p in found:
        print(f"::error::{p}")
    if found:
        raise SystemExit(f"{len(found)} health problem(s)")
    print("healthy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
