"""The card's season sentence follows the new active months (T-268 · review B-04)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.templates_i18n import when_and_how  # noqa: E402
from rebuild_when_how import rewritten  # noqa: E402

ALL_YEAR = list(range(1, 13))


def test_a_template_sentence_is_rewritten_from_the_new_months():
    old = when_and_how("bird", ALL_YEAR, "sv")
    assert "året runt" in old
    new = rewritten(old, "bird", [5, 6, 7, 8], "sv")
    assert new == when_and_how("bird", [5, 6, 7, 8], "sv")
    assert "året runt" not in new


def test_the_water_hint_is_kept():
    old = when_and_how("bird", ALL_YEAR, "en", aquatic=True)
    assert rewritten(old, "bird", [4, 5], "en") == when_and_how("bird", [4, 5], "en", aquatic=True)


def test_an_unchanged_sentence_and_a_hand_written_one_are_left_alone():
    same = when_and_how("plant", [5, 6], "en")
    assert rewritten(same, "plant", [5, 6], "en") is None
    assert rewritten("Seen from May along the river.", "bird", [5, 6], "en") is None
    assert rewritten(when_and_how("bird", ALL_YEAR, "en"), "bird", [5], "xx") is None
