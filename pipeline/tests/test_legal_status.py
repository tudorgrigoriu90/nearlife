"""Invasive mark for the card (T-336 · review F-01)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_legal_status import UNION_LIST, fetch_records, invasive_ids  # noqa: E402

SQL = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261119000008_species_legal_status.sql"
).read_text()


def test_species_with_a_backbone_key_are_marked():
    recs = [
        {"rank": "SPECIES", "nubKey": 3170247},  # Asclepias syriaca
        {"rank": "GENUS", "nubKey": 1},  # a genus would mark every member
        {"rank": "SPECIES"},  # no backbone key, no match
    ]
    assert invasive_ids(recs) == {"gbif:3170247"}


def test_every_page_is_read_from_the_union_list():
    pages = [{"results": [{"rank": "SPECIES", "nubKey": 1}], "endOfRecords": False}, {"results": [], "endOfRecords": True}]
    seen = []

    class Session:
        def get(self, url, params, timeout):
            seen.append((params["datasetKey"], params["offset"]))

            class R:
                def raise_for_status(self):
                    pass

                def json(self):
                    return pages[len(seen) - 1]

            return R()

    assert len(fetch_records(Session(), page=1)) == 1
    assert seen == [(UNION_LIST, 0), (UNION_LIST, 1)]


def test_the_table_takes_only_the_two_statuses():
    assert "legal_status in ('protected', 'invasive')" in SQL
    assert "legal_status     text" in SQL and "s.legal_status" in SQL
