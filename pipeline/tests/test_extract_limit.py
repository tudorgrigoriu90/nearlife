"""Wikipedia returns at most 20 intro extracts per request (T-259).

TextExtracts caps `exlimit` at 20 when `exintro` is set. The batch asked for 50 titles, got 20
extracts plus an `excontinue`, and never followed it, so up to 30 of every 50 species lost their
fact: the magpie, the house sparrow and the nuthatch had no fact in English or Swedish.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.wikimedia import EXTRACT_BATCH, WikimediaClient  # noqa: E402


class FakeWiki(WikimediaClient):
    """Behaves like the real API: 20 extracts per response, the rest via excontinue."""

    def __init__(self):
        super().__init__(pause=0)
        self.calls = []

    def _get(self, base, params):
        self.calls.append(params)
        titles = params["titles"].split("|")
        start = int(params.get("excontinue", 0))
        pages = {}
        for i, t in enumerate(titles):
            page = {"title": t}
            if start <= i < start + 20:
                page["extract"] = f"About {t}."
            pages[str(i)] = page
        out = {"query": {"pages": pages}}
        if start + 20 < len(titles):
            out["continue"] = {"excontinue": start + 20, "continue": "||"}
        return out


def test_every_species_in_a_batch_gets_its_extract():
    wiki = FakeWiki()
    names = [f"Genus species{i}" for i in range(55)]
    facts = wiki.fetch_extracts(names, "en")
    assert all(facts[n] == f"About {n}." for n in names)


def test_batches_fit_the_limit_so_one_request_is_usually_enough():
    assert EXTRACT_BATCH <= 20
    wiki = FakeWiki()
    wiki.fetch_extracts([f"Genus species{i}" for i in range(40)], "en")
    assert len(wiki.calls) == 2
