"""Sweden's own Red List beside the worldwide one (T-332 · review I-35)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_redlist_se import DATASET, fetch_records, statuses_from_records  # noqa: E402

SQL = (
    Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261119000007_species_redlist_se.sql"
).read_text()


def rec(nub, status, rank="SPECIES", name="X y"):
    return {"nubKey": nub, "threatStatuses": [status], "rank": rank, "canonicalName": name}


def test_only_threatened_and_regionally_extinct_are_kept():
    out = statuses_from_records([
        rec(1, "VULNERABLE"),
        rec(2, "DATA_DEFICIENT"),
        rec(3, "REGIONALLY_EXTINCT"),
        rec(4, "NEAR_THREATENED"),
        rec(5, "LEAST_CONCERN"),
    ])
    assert out == {"gbif:1": "VU", "gbif:3": "RE", "gbif:4": "NT"}


def test_only_species_with_a_backbone_key_are_matched():
    # A genus or an aggregate would paint its status on every member; no backbone key, no match.
    out = statuses_from_records([rec(1, "ENDANGERED", rank="GENUS"), {"threatStatuses": ["ENDANGERED"], "rank": "SPECIES"}])
    assert out == {}


def test_the_worse_status_wins_when_two_records_share_a_backbone_key():
    assert statuses_from_records([rec(7, "NEAR_THREATENED"), rec(7, "CRITICALLY_ENDANGERED")]) == {"gbif:7": "CR"}


def test_every_page_is_read():
    pages = [
        {"results": [rec(1, "VULNERABLE")], "endOfRecords": False},
        {"results": [rec(2, "ENDANGERED")], "endOfRecords": True},
    ]
    seen = []

    class Session:
        def get(self, url, params, timeout):
            seen.append(params["offset"])

            class R:
                def raise_for_status(self):
                    pass

                def json(self):
                    return pages[len(seen) - 1]

            assert params["datasetKey"] == DATASET
            return R()

    assert len(fetch_records(Session(), page=1)) == 2
    assert seen == [0, 1]


def test_the_table_takes_only_the_codes_the_card_shows():
    assert "redlist_se in ('NT', 'VU', 'EN', 'CR', 'RE')" in SQL
    assert "redlist_se       text" in SQL and "s.redlist_se" in SQL
