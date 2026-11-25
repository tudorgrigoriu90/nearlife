"""Translations made from Swedish while the English fact now exists (T-396): found by the words a
translation keeps unchanged (Latin family names, numbers), then cleared to be translated again
from English, one step instead of two."""

from retranslate_from_english import came_from_swedish

EN = "The duck mussel (Anodonta anatina) is a species of freshwater mussel in the family Unionidae, the river mussels."
SV = ("Vanlig dammussla (Anodonta anatina) är Sveriges vanligaste stormusselart. Den finns i hela Sverige om man "
      "bortser från de allra nordligaste delarna och fjällkedjan.")


def test_the_duck_mussel_was_translated_from_swedish():
    ro = ("Șoarecele obişnuit al femeilor (Anodonta Anatina) este cea mai folosită artă a șoarecilor mari din Suedia. "
          "Se găsește în Suedia dacă ignorați cele mai nordice părți și lanțul de munte.")
    assert came_from_swedish(ro, EN, SV) is True


def test_a_translation_of_the_english_fact_is_kept():
    ro = "Scoica de rață (Anodonta anatina) este o specie de scoică de apă dulce din familia Unionidae."
    assert came_from_swedish(ro, EN, SV) is False


def test_numbers_that_only_the_swedish_fact_has_give_it_away():
    en = "The vendace is a freshwater whitefish."
    sv = "Siklöjan blir sällan längre än 20 centimeter och leker i november 1950."
    assert came_from_swedish("Peștele rar depășește 20 de centimetri și se reproduce în 1950.", en, sv) is True
    assert came_from_swedish("Coregonul este un pește alb de apă dulce.", en, sv) is False


def test_without_anything_that_survives_translation_nothing_is_cleared():
    assert came_from_swedish("Un text oarecare.", "A plain sentence.", "En enkel mening.") is False
    assert came_from_swedish("Un text.", None, SV) is False  # no English fact: nothing to translate from
