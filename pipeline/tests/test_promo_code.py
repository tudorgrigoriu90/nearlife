"""Making an access code (T-356 · review F-19): the code is shown once, only its hash is stored."""

import hashlib
import re

import pytest

from promo_code import insert_sql, make_code, normalise


def test_a_code_is_long_random_and_readable():
    code = make_code()
    assert re.fullmatch(r"NEARBY-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}", code)
    assert make_code() != code
    # No 0/O or 1/I/L to misread from print.
    assert not set("01OIL") & set(code[len("NEARBY-"):].replace("-", ""))


def test_the_sql_holds_only_the_hash_of_the_normalised_code():
    sql = insert_sql("NEARBY-ABCD-EFGH-JKMN", "Växjö library", ["region_SWE_9_1"], 30, "2027-06-30")
    digest = hashlib.sha256(normalise("nearby abcd efgh jkmn").encode()).hexdigest()
    assert digest in sql
    assert "ABCD" not in sql
    assert "array['region_SWE_9_1']" in sql and "30" in sql and "'2027-06-30T23:59:59Z'" in sql
    assert "'Växjö library'" in sql


def test_labels_are_quoted_and_grants_checked():
    assert "'O''Brien school'" in insert_sql("NEARBY-ABCD-EFGH-JKMN", "O'Brien school", ["full_game"], 1, "2027-01-01")
    for bad in ([], ["family"], ["full_game; drop table x"]):
        with pytest.raises(ValueError):
            insert_sql("NEARBY-ABCD-EFGH-JKMN", "x", bad, 1, "2027-01-01")
    with pytest.raises(ValueError):
        insert_sql("NEARBY-ABCD-EFGH-JKMN", "x", ["full_game"], 0, "2027-01-01")
    with pytest.raises(ValueError):
        insert_sql("NEARBY-ABCD-EFGH-JKMN", "x", ["full_game"], 1, "next year")
