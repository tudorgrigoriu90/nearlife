"""Per-language fact sourcing (T-179).

The immigrant-language roster is v1 scope and free (T-178), so every shipped species needs a fact
in ~18 languages. Machine-translating 6,824 English facts per language is the expensive way to get
there and produces worse prose than the alternative: Wikipedia already *has* those articles,
written natively, under the same CC BY-SA licence we already attribute.

So `fact` is sourced per language rather than translated. This pins the wiring — that the host
follows the language, and that a language code can never be smuggled into the URL.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.wikimedia import wiki_api_for  # noqa: E402


def test_english_is_the_default_host():
    assert wiki_api_for("en") == "https://en.wikipedia.org/w/api.php"


def test_the_host_follows_the_language():
    assert wiki_api_for("sv") == "https://sv.wikipedia.org/w/api.php"
    assert wiki_api_for("ar") == "https://ar.wikipedia.org/w/api.php"


def test_locale_codes_with_a_region_use_the_language_subdomain():
    # Wikipedia is keyed by language, not locale: there is no pt-BR.wikipedia.org.
    assert wiki_api_for("pt-BR") == "https://pt.wikipedia.org/w/api.php"


def test_underscored_locale_forms_are_accepted_too():
    assert wiki_api_for("zh_Hans") == "https://zh.wikipedia.org/w/api.php"


def test_case_is_normalised():
    assert wiki_api_for("SV") == "https://sv.wikipedia.org/w/api.php"


def test_a_code_that_is_not_a_language_is_refused():
    # Anything reaching the URL unchecked is a request to an arbitrary host.
    for bad in ("", "e", "toolong", "sv/../evil", "sv.evil.com", "../x", "s v"):
        try:
            wiki_api_for(bad)
        except ValueError:
            continue
        raise AssertionError(f"expected {bad!r} to be refused")
