"""Batched Wikipedia extract fetching (T-182).

T-181 multiplied the content build by the locale count: ~6,824 species x 18 locales is ~123k
requests, roughly 20 hours at the client's polite pacing, against a 6-hour Actions cap. The
MediaWiki API accepts up to 50 titles per query, which cuts that ~50x — reducing the work rather
than redistributing it, and being far politer to Wikipedia than 123k individual requests.

Mapping the response back is the part that can silently go wrong: MediaWiki keys pages by page id
and reports title normalisation and redirects in separate arrays, so a naive lookup by requested
name loses exactly the species whose article sits behind a redirect.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.wikimedia import chunked, map_extracts  # noqa: E402


def test_chunks_respect_the_api_limit():
    assert [len(c) for c in chunked(list(range(120)), 50)] == [50, 50, 20]


def test_chunking_preserves_every_item_in_order():
    items = [f"s{i}" for i in range(7)]
    assert [x for c in chunked(items, 3) for x in c] == items


def test_empty_input_yields_no_chunks():
    assert list(chunked([], 50)) == []


def test_maps_extracts_back_to_the_requested_names():
    payload = {"query": {"pages": {
        "1": {"title": "Pica pica", "extract": "A magpie."},
        "2": {"title": "Vulpes vulpes", "extract": "A fox."},
    }}}
    assert map_extracts(payload, ["Pica pica", "Vulpes vulpes"]) == {
        "Pica pica": "A magpie.",
        "Vulpes vulpes": "A fox.",
    }


def test_follows_a_redirect_back_to_the_name_that_was_asked_for():
    # Without this the species whose article lives under a synonym silently loses its fact.
    payload = {"query": {
        "redirects": [{"from": "Parus caeruleus", "to": "Cyanistes caeruleus"}],
        "pages": {"1": {"title": "Cyanistes caeruleus", "extract": "A blue tit."}},
    }}
    assert map_extracts(payload, ["Parus caeruleus"]) == {"Parus caeruleus": "A blue tit."}


def test_follows_normalisation_too():
    payload = {"query": {
        "normalized": [{"from": "pica pica", "to": "Pica pica"}],
        "pages": {"1": {"title": "Pica pica", "extract": "A magpie."}},
    }}
    assert map_extracts(payload, ["pica pica"]) == {"pica pica": "A magpie."}


def test_chains_normalisation_into_a_redirect():
    payload = {"query": {
        "normalized": [{"from": "parus caeruleus", "to": "Parus caeruleus"}],
        "redirects": [{"from": "Parus caeruleus", "to": "Cyanistes caeruleus"}],
        "pages": {"1": {"title": "Cyanistes caeruleus", "extract": "A blue tit."}},
    }}
    assert map_extracts(payload, ["parus caeruleus"]) == {"parus caeruleus": "A blue tit."}


def test_a_missing_page_maps_to_none_not_a_dropped_key():
    # Every requested name must appear, so the caller can tell "no article" from "not asked".
    payload = {"query": {"pages": {"-1": {"title": "Nonesuch obscura", "missing": ""}}}}
    assert map_extracts(payload, ["Nonesuch obscura"]) == {"Nonesuch obscura": None}


def test_an_empty_extract_is_none_rather_than_an_empty_string():
    payload = {"query": {"pages": {"1": {"title": "Pica pica", "extract": "   "}}}}
    assert map_extracts(payload, ["Pica pica"]) == {"Pica pica": None}


def test_a_name_absent_from_the_response_entirely_still_appears():
    assert map_extracts({"query": {"pages": {}}}, ["Pica pica"]) == {"Pica pica": None}
