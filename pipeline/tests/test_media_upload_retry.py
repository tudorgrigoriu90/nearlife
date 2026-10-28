"""Photo re-hosting survives Wikimedia's rate limit (T-210)."""

import sys
from pathlib import Path

import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.supabase_upload import fetch_with_retry, retry_delay  # noqa: E402


class Resp:
    def __init__(self, status, retry_after=None):
        self.status_code = status
        self.headers = {"Retry-After": retry_after} if retry_after else {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(str(self.status_code))


class Session:
    def __init__(self, statuses):
        self.responses = [Resp(*s) if isinstance(s, tuple) else Resp(s) for s in statuses]
        self.calls = 0

    def get(self, url, timeout):
        self.calls += 1
        return self.responses.pop(0)


def test_backs_off_through_rate_limits_and_succeeds():
    waits = []
    resp = fetch_with_retry(Session([429, (429, "7"), 200]), "u", sleep=waits.append)
    assert resp.status_code == 200
    assert waits == [2.0, 7.0]  # own backoff, then the server's Retry-After


def test_gives_up_after_the_last_attempt_with_the_real_error():
    session = Session([429] * 5)
    with pytest.raises(requests.HTTPError, match="429"):
        fetch_with_retry(session, "u", sleep=lambda _s: None)
    assert session.calls == 5


def test_does_not_retry_a_real_failure():
    session = Session([404])
    with pytest.raises(requests.HTTPError, match="404"):
        fetch_with_retry(session, "u", sleep=lambda _s: None)
    assert session.calls == 1


def test_retry_delay_caps_and_ignores_unparseable_dates():
    assert retry_delay(3, None) == 8.0
    assert retry_delay(1, "999") == 120.0
    assert retry_delay(2, "Wed, 21 Oct 2026 07:28:00 GMT") == 4.0
