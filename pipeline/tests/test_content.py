"""Tests for the national-content template logic (T-135) — pure, no network."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from media.content_templates import TAXON_FROM_FILE, TEMPLATES, months_phrase, when_and_how


def test_months_phrase_year_round():
    assert months_phrase(list(range(1, 13))) == "year-round"


def test_months_phrase_contiguous_range():
    assert months_phrase([5, 6, 7, 8]) == "from May to August"


def test_months_phrase_non_contiguous_lists_months():
    out = months_phrase([1, 6, 12])
    assert out.startswith("in ")
    assert "January" in out and "June" in out and "December" in out


def test_months_phrase_dedupes_and_sorts():
    assert months_phrase([8, 5, 6, 7, 5]) == "from May to August"


def test_when_and_how_is_honest_and_seasoned():
    line = when_and_how("bird", [5, 6, 7])
    assert "Active in your region" in line
    assert "from May to July" in line
    # Honest-copy rule: never claims real-time presence.
    assert "right now" not in line.lower()


def test_every_taxon_mapping_has_a_template():
    for taxon in TAXON_FROM_FILE.values():
        assert taxon in TEMPLATES
        assert TEMPLATES[taxon]["give"] and TEMPLATES[taxon]["protect"]


def test_give_protect_carry_no_release_directive():
    # Safety: templates must never tell users to release organisms into the wild. "catch-and-
    # release" (returning a caught fish) is the opposite — a good practice — so it's excluded.
    for tpl in TEMPLATES.values():
        blob = (tpl["give"] + " " + tpl["protect"]).lower().replace("catch-and-release", "")
        assert "release" not in blob


def test_plant_template_only_speaks_generically_of_native_plants():
    # The one taxon that mentions planting must stay generic (native/non-native), never a species.
    plant = TEMPLATES["plant"]["give"] + " " + TEMPLATES["plant"]["protect"]
    assert "native plants" in plant.lower()
    assert "non-native" in plant.lower()
