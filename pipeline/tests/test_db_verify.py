"""The live-check verdict logic (T-200). The checks themselves need a database; the judging does not."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.verify import EXACT, EXPECTED, evaluate  # noqa: E402


def passing() -> dict[str, str]:
    return {
        step: (expected if expected in EXACT or "-" in expected else f'ERROR: {expected} for table x')
        for step, expected in EXPECTED.items()
    }


def test_all_rules_holding_is_a_pass():
    assert evaluate(passing()) == []


def test_a_fourth_catch_that_succeeds_is_a_failure():
    results = passing()
    results["catch 4 (over the free allowance)"] = "ok"
    assert evaluate(results) == [
        "catch 4 (over the free allowance): expected an error containing 'free_catch_limit', got 'ok'"
    ]


def test_a_refused_legitimate_write_is_a_failure():
    results = passing()
    results["app-style home_region upsert"] = "permission denied for table profiles"
    assert len(evaluate(results)) == 1


def test_a_wrong_season_key_and_a_missing_step_are_failures():
    results = passing()
    results["season_key 2026-12-15 (December → next year's winter)"] = "2026-winter"
    del results["season_key 2026-07-01"]
    assert len(evaluate(results)) == 2


def test_a_deleted_live_account_is_a_failure():
    # The retention job's worst possible bug: deleting someone who still uses the app.
    results = passing()
    results["anonymous, old sign-in but a session refreshed today"] = "deleted"
    assert evaluate(results) == [
        "anonymous, old sign-in but a session refreshed today: expected 'kept', got 'deleted'"
    ]


def test_kept_is_not_matched_as_a_substring():
    results = passing()
    results["anonymous, no activity for 200 days"] = "kept"
    assert len(evaluate(results)) == 1
