"""Filling missing second-language facts by free offline machine translation (T-235).

Facts come from each language's own Wikipedia (T-179), and small editions barely cover Swedish
species: Somali had a fact for 56 of 8,080 species. The Director chose (2026-11-01) to fill the gaps
by translating the English Wikipedia fact with an open-source offline model, at $0, shown under the
"Machine-translated" label the second language already carries.

The rules worth pinning: a language's own Wikipedia fact always wins and is never overwritten; the
source is the English fact, else the Swedish one routed through English; English and Swedish are
not targets; and a later content load must not wipe what was translated.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.supabase_load_content import CONTENT_SQL  # noqa: E402
from translate_facts import TARGET_LOCALES, plan_translations, translate_missing  # noqa: E402


def test_targets_are_the_second_languages_not_english_or_swedish():
    assert "en" not in TARGET_LOCALES and "sv" not in TARGET_LOCALES
    assert {"ro", "ar", "so", "uk", "de"} <= set(TARGET_LOCALES)


def test_the_english_fact_is_the_source_and_swedish_is_the_fallback():
    rows = [
        {"species_id": "a", "en": "An owl.", "sv": "En uggla."},
        {"species_id": "b", "en": None, "sv": "En gädda."},
        {"species_id": "c", "en": None, "sv": None},
    ]
    plan = plan_translations(rows)
    assert plan == [("a", "An owl.", "en"), ("b", "En gädda.", "sv")]


def test_translate_routes_swedish_through_english_and_skips_failures():
    calls = []

    def fake(text, src, dst):
        calls.append((src, dst))
        if text == "boom":
            raise RuntimeError("model hiccup")
        return f"[{dst}] {text}"

    out = translate_missing(
        [("a", "An owl.", "en"), ("b", "En gädda.", "sv"), ("c", "boom", "en")], "ro", fake
    )
    assert out == {"a": "[ro] An owl.", "b": "[ro] [en] En gädda."}
    assert ("sv", "en") in calls and ("en", "ro") in calls


def test_blank_or_unchanged_output_is_not_written():
    out = translate_missing([("a", "An owl.", "en"), ("b", "Bee.", "en")], "ro",
                            lambda t, s, d: "" if t == "An owl." else t)
    assert out == {}


def test_a_content_load_keeps_a_translated_fact_but_a_wikipedia_fact_replaces_it():
    # The annual content run writes NULL where a language has no article; that must not erase the
    # translation, while a real article arriving later still takes over.
    assert "fact=coalesce(excluded.fact, public.species_content.fact)" in CONTENT_SQL


def test_the_workflow_matrix_covers_every_target_language():
    import re

    wf = (Path(__file__).resolve().parents[2] / ".github" / "workflows" / "translate-facts.yml").read_text()
    block = wf[wf.index("locale: [") : wf.index("]", wf.index("locale: ["))]
    assert set(re.findall(r"[a-z]{2,3}", block.replace("locale", ""))) == set(TARGET_LOCALES)
