"""Which key a duplicate species is merged into (T-373)."""

from merge_duplicates import choose


def c(sid, status, occ):
    return {"id": sid, "status": status, "occurrences": occ}


def test_gbif_accepted_beats_doubtful_even_with_fewer_records():
    keep, merge = choose([c("gbif:2688495", "DOUBTFUL", 900), c("gbif:8190643", "ACCEPTED", 100)])
    assert keep == "gbif:8190643" and merge == ["gbif:2688495"]


def test_a_curated_species_always_stays():
    keep, merge = choose([c("great-tit", "SYNONYM", 1), c("gbif:9705453", "ACCEPTED", 5000)])
    assert keep == "great-tit" and merge == ["gbif:9705453"]


def test_between_equals_the_one_with_more_records_then_the_lower_key():
    assert choose([c("gbif:2", "ACCEPTED", 10), c("gbif:1", "ACCEPTED", 50)])[0] == "gbif:1"
    assert choose([c("gbif:20", "ACCEPTED", 10), c("gbif:3", "ACCEPTED", 10)])[0] == "gbif:3"


def test_unknown_status_ranks_below_accepted():
    assert choose([c("gbif:1", None, 999), c("gbif:2", "ACCEPTED", 1)])[0] == "gbif:2"
