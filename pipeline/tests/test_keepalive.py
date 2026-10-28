"""Keeping the Supabase project awake, and noticing if it is hollow (T-203).

Supabase pauses a free project after **7 consecutive days** of inactivity, and a paused project
takes the app down with it. A scheduled query is enough to prevent that — but a job that only says
"I ran" is a wasted slot: the same query can report whether the data is still there, so the
keep-alive doubles as the only continuous monitoring this project has.

The counts are checked, not just fetched. A project that is awake and empty is a worse state than a
paused one, because nothing looks wrong.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.keepalive import summarise  # noqa: E402

HEALTHY = {"species": 11936, "species_presence": 78530, "species_content": 2052}


def test_a_healthy_project_reports_ok():
    assert summarise(HEALTHY).ok


def test_an_empty_table_is_not_ok():
    # Awake and empty is worse than paused: the app returns nothing and nothing looks broken.
    verdict = summarise({**HEALTHY, "species": 0})
    assert not verdict.ok
    assert "species" in verdict.reason


def test_the_reason_names_the_table_and_the_count():
    verdict = summarise({**HEALTHY, "species_content": 0})
    assert "species_content" in verdict.reason


def test_a_missing_table_is_reported_rather_than_assumed_healthy():
    # A table that vanished from the query result must not pass by omission.
    verdict = summarise({"species": 11936})
    assert not verdict.ok


def test_the_summary_line_carries_every_count_for_the_log():
    line = summarise(HEALTHY).line
    for table, count in HEALTHY.items():
        assert table in line and str(count) in line


def test_it_does_not_care_that_counts_changed_only_that_they_exist():
    # Growth and ordinary churn are not this job's business — T-192 owns that judgement. Here the
    # only question is whether the project is awake and non-empty.
    assert summarise({"species": 1, "species_presence": 1, "species_content": 1}).ok


# T-204: the DB-only keep-alive succeeded on Aug 31 and Sep 3 and the project paused anyway by
# Sep 7. A direct Postgres query through the pooler evidently does not count as activity for
# Supabase's pause logic, so the job now also makes a request through the REST API — the path the
# app itself uses.

from db.keepalive import rest_ping_request  # noqa: E402


def test_rest_ping_targets_the_rest_api_not_postgres():
    url, _ = rest_ping_request("https://abc.supabase.co/", "sb_secret_x")
    assert url == "https://abc.supabase.co/rest/v1/species?select=id&limit=1"


def test_rest_ping_authenticates_with_the_key_in_both_headers():
    _, headers = rest_ping_request("https://abc.supabase.co", "sb_secret_x")
    assert headers["apikey"] == "sb_secret_x"
    assert headers["Authorization"] == "Bearer sb_secret_x"


def test_rest_ping_refuses_a_missing_url_or_key():
    for url, key in (("", "k"), ("https://abc.supabase.co", "")):
        try:
            rest_ping_request(url, key)
        except ValueError:
            continue
        raise AssertionError("expected a missing setting to raise")
