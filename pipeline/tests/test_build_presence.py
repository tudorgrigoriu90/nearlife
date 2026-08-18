"""Signature + region-plumbing tests for the presence builder (no network).

T-173. build_presence.py is nearly all network I/O, so it had no tests at all — and T-167 changed
`build_for_taxon` to take the region list without updating its signature. Both call sites passed
three arguments to a two-argument function, so *every* taxon died instantly with a TypeError, for
Sweden as well as the Nordics. It reached CI because nothing here was ever called in a test.

These use a fake client: they cannot prove GBIF's responses are right, but they do prove the
function is callable as called, and that it walks the regions it was handed rather than a
hardcoded country.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_presence import build_for_taxon  # noqa: E402

TAXON = {"key": "birds", "names": ["Aves"], "facetLimit": 10, "minOccurrences": 0}
NOR = [{"gid": "NOR.1_1", "name": "Agder"}, {"gid": "NOR.2_1", "name": "Innlandet"}]


class FakeClient:
    """Records which regions were asked for, so we can assert on the traversal."""

    def __init__(self):
        self.asked = []

    def resolve_taxon_key(self, name):
        return 212

    def species_facet(self, gid, taxon_key, month, facet_limit=300):
        self.asked.append(gid)
        return [(5231190, 40)], False

    def scientific_name(self, key):
        return "Pica pica"


def test_build_for_taxon_accepts_the_regions_it_is_called_with():
    # The regression itself: this raised TypeError before the signature was fixed.
    client = FakeClient()
    payload = build_for_taxon(client, TAXON, NOR)
    assert payload["records"]


def test_it_queries_exactly_the_regions_it_was_handed():
    client = FakeClient()
    build_for_taxon(client, TAXON, NOR)
    assert set(client.asked) == {"NOR.1_1", "NOR.2_1"}
    assert not any(g.startswith("SWE.") for g in client.asked)


def test_every_region_is_queried_for_all_twelve_months():
    client = FakeClient()
    build_for_taxon(client, TAXON, NOR)
    assert len(client.asked) == len(NOR) * 12


def test_records_carry_the_region_name_from_the_regions_passed_in():
    # Non-Swedish regions used to fall back to their gid as a name (T-167).
    client = FakeClient()
    payload = build_for_taxon(client, TAXON, NOR)
    names = {r["countyName"] for r in payload["records"]}
    assert names == {"Agder", "Innlandet"}


def test_meta_counts_the_regions_actually_used():
    client = FakeClient()
    payload = build_for_taxon(client, TAXON, NOR)
    assert payload["meta"]["counties"] == 2
