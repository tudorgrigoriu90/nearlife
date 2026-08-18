"""Localised give/protect/habitat templates and season phrasing (T-180).

Only ~46 strings per language cover `give`, `protect` and `whenAndHow` for all 6,824 shipped
species, because those three fields are taxon templates rather than per-species text. That is the
whole translation job now that facts are sourced per language (T-179).

The season phrase is the part that cannot be a translated string. English builds it by
concatenation — "from May to September" — and that breaks in every language that inflects a month
after a preposition. Each locale therefore supplies its own month forms and patterns.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.content_templates import TEMPLATES  # noqa: E402
from media.templates_i18n import (  # noqa: E402
    LOCALES,
    months_phrase,
    strings_for,
    when_and_how,
)

TAXA = set(TEMPLATES)


def test_english_matches_the_original_wording():
    # The English output must not drift while being refactored into the locale table.
    assert when_and_how("mammal", list(range(1, 13)), "en").startswith("Active in your region")
    assert months_phrase([5, 6, 7, 8, 9], "en") == "from May to September"
    assert months_phrase(list(range(1, 13)), "en") == "year-round"


def test_swedish_season_phrases():
    assert months_phrase(list(range(1, 13)), "sv") == "året runt"
    assert months_phrase([5, 6, 7, 8, 9], "sv") == "från maj till september"


def test_a_broken_run_is_listed_rather_than_described_as_a_range():
    # A species active only in spring and autumn is not "from March to October".
    assert months_phrase([3, 10], "en") == "in March, October"


def test_no_months_never_claims_a_season():
    for loc in LOCALES:
        phrase = months_phrase([], loc)
        assert phrase and phrase == strings_for(loc).unknown


def test_every_locale_covers_every_taxon():
    for loc in LOCALES:
        assert set(strings_for(loc).templates) == TAXA, loc


def test_every_locale_has_twelve_months_in_all_three_forms():
    # Three, not two: Russian needs "в мае" (list), "с мая" (from) and "по сентябрь" (to).
    for loc in LOCALES:
        st = strings_for(loc)
        assert len(st.months) == 12, loc
        assert len(st.months_from) == 12, loc
        assert len(st.months_to) == 12, loc


def test_no_locale_ships_an_empty_string():
    for loc in LOCALES:
        st = strings_for(loc)
        for taxon, fields in st.templates.items():
            for key in ("give", "protect", "habitat"):
                assert fields[key].strip(), (loc, taxon, key)


def test_the_sentence_pattern_keeps_both_slots():
    # Losing {hint} would silently drop the habitat half for a whole language.
    for loc in LOCALES:
        assert "{when}" in strings_for(loc).sentence, loc
        assert "{hint}" in strings_for(loc).sentence, loc


def test_a_translated_locale_actually_differs_from_english():
    # Catches a locale registered by copying the English table in as a placeholder.
    for loc in LOCALES:
        if loc == "en":
            continue
        assert strings_for(loc).templates["bird"]["give"] != TEMPLATES["bird"]["give"], loc


def test_unknown_locale_is_refused_rather_than_falling_back_to_english():
    # Silently serving English to a Somali reader is worse than failing the build.
    try:
        strings_for("xx")
    except KeyError:
        return
    raise AssertionError("expected an unregistered locale to raise")


def test_when_and_how_composes_both_halves():
    out = when_and_how("bird", [5, 6], "sv")
    assert "från maj till juni" in out
    assert strings_for("sv").templates["bird"]["habitat"] in out
