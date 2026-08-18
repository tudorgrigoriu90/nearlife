"""The occurrence query must ask GBIF for commercially-usable records only (T-042/T-199).

`docs/DATA-SOURCING-LICENSING.md §1` is the reason the app can exist commercially: only CC0 and
CC-BY occurrence records may be used, because NC (non-commercial) and ND (no-derivatives) records
cannot. That rule is enforced in exactly one place — the `license` parameters on
`/occurrence/search` — and it had **no test**, while the *media* licence filter did.

The asymmetry matters. A dropped media licence check shows up as a missing photo; a dropped
occurrence licence check shows up as nothing at all, because NC records look identical to CC-BY
ones once counted. The failure is silent, legal, and only discoverable by reading the code.

CLAUDE.md lists NC-license filtering among the rules that get explicit tests. This is that test.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.client import ALLOWED_LICENSES, GbifClient  # noqa: E402


class SpyClient(GbifClient):
    """Captures the query instead of issuing it — no network, and the params are the contract."""

    def __init__(self):
        super().__init__(pause=0)
        self.last_path = None
        self.last_params = None

    def _get(self, path, params):
        self.last_path = path
        self.last_params = params
        return {"facets": [{"counts": [{"name": "5231190", "count": 42}]}]}


def _params():
    client = SpyClient()
    client.species_facet("SWE.9_1", 212, 5)
    return client, list(client.last_params)


def test_only_cc0_and_cc_by_are_permitted():
    # If this list ever grows, it is a licensing decision and not a code change.
    assert ALLOWED_LICENSES == ["CC0_1_0", "CC_BY_4_0"]


def test_every_permitted_licence_is_sent_as_a_filter():
    _, params = _params()
    sent = [value for key, value in params if key == "license"]
    assert sent == ALLOWED_LICENSES


def test_the_query_is_never_issued_without_a_licence_filter():
    # The whole rule: an unfiltered occurrence search silently counts NC and ND records.
    _, params = _params()
    assert any(key == "license" for key, _ in params)


def test_no_non_commercial_licence_is_ever_requested():
    _, params = _params()
    for key, value in params:
        if key == "license":
            assert "NC" not in value and "ND" not in value, value


def test_the_region_and_country_cannot_disagree():
    # Asking for a Swedish region while filtering on another country returns zero rather than an
    # error, so the two are derived from one id (T-167) — worth pinning beside the licence rule
    # because both failures are silent.
    _, params = _params()
    assert ("country", "SE") in params
    assert ("gadmGid", "SWE.9_1") in params


def test_it_queries_the_occurrence_search_endpoint():
    client, _ = _params()
    assert client.last_path == "/occurrence/search"
