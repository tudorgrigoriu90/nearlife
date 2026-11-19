"""The weekly list of "Report a mistake" reports (T-293 · review I-32)."""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.content_reports import Report, summarise  # noqa: E402
from db.health import EXPECTED_JOBS  # noqa: E402

AT = datetime(2026, 11, 19, 8, 0, tzinfo=timezone.utc)


def r(species="gbif:1", name="Älg", kind="photo", locale="sv", comment=None):
    return Report(species_id=species, name=name, kind=kind, locale=locale, comment=comment, created_at=AT)


def test_no_reports_says_so():
    assert "No reports" in summarise([], days=7)


def test_groups_by_species_most_reported_first():
    out = summarise([r(), r("gbif:2", "Räv", "name"), r(kind="text")], days=7)
    assert "3 reports" in out
    assert out.index("Älg") < out.index("Räv")
    assert "gbif:1" in out and "photo" in out and "text" in out


def test_a_comment_cannot_break_out_of_the_table():
    out = summarise([r(comment="a | b\n## injected\n<img src=x>")], days=7)
    row = [line for line in out.splitlines() if "gbif:1" in line and "injected" in line][0]
    assert "a \\| b" in row  # the pipe is escaped, so the row keeps its columns
    assert "\n## injected" not in out  # the newline is folded into the row
    assert "<img" not in out  # no HTML reaches the summary


def test_a_long_comment_is_shortened_in_the_list():
    out = summarise([r(comment="x" * 500)], days=7)
    assert "x" * 200 not in out


def test_health_watches_the_report_expiry():
    # Reports are kept 365 days (privacy policy): a stopped expiry job would keep them longer.
    assert "expire-content-reports" in EXPECTED_JOBS
