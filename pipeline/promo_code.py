"""Make a gift or promo code (T-356 · review F-19).

    python pipeline/promo_code.py --label "Växjö library" --grant region_SWE_9_1 --uses 30 --expires 2027-06-30

Prints the code once, for the Director to hand over, and the SQL that stores only its SHA-256
hash (run it in the Supabase SQL editor). The code itself is never written anywhere: like the
reviewer code (T-237), a leaked code would unlock paid content for anyone holding it.

Grants: full_game, all_regions, or region_SWE_<n>_1 (one county pack; GADM ids, e.g. SWE.9_1 is
Kronoberg). The database refuses anything else (`reviewer_codes_grants_valid`).
"""

import argparse
import hashlib
import re
import secrets

# 30 letters and digits that cannot be misread from print (no 0/O, 1/I/L): 12 of them ≈ 59 bits.
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ2345678"
GRANT = re.compile(r"^(full_game|all_regions|region_SWE_[0-9]+_1)$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def make_code() -> str:
    groups = ["".join(secrets.choice(ALPHABET) for _ in range(4)) for _ in range(3)]
    return "NEARBY-" + "-".join(groups)


def normalise(code: str) -> str:
    """As the database does before hashing: upper case, letters and digits only."""
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def insert_sql(code: str, label: str, grants: list[str], uses: int, expires: str) -> str:
    if not grants or len(grants) > 3 or not all(GRANT.match(g) for g in grants):
        raise ValueError(f"grants must be 1-3 of full_game, all_regions, region_SWE_<n>_1: {grants}")
    if uses < 1:
        raise ValueError("a code needs at least one use")
    if not DATE.match(expires):
        raise ValueError("expires is a date, YYYY-MM-DD")
    digest = hashlib.sha256(normalise(code).encode()).hexdigest()
    quoted = label.replace("'", "''")
    array = ", ".join(f"'{g}'" for g in grants)
    return (
        "insert into public.reviewer_codes (code_hash, label, uses_left, expires_at, grants)\n"
        f"values ('{digest}', '{quoted}', {uses}, '{expires}T23:59:59Z', array[{array}]);"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--label", required=True)
    parser.add_argument("--grant", action="append", required=True)
    parser.add_argument("--uses", type=int, required=True)
    parser.add_argument("--expires", required=True)
    args = parser.parse_args()
    code = make_code()
    print(f"Code (hand it over; it is not stored anywhere): {code}\n")
    print(insert_sql(code, args.label, args.grant, args.uses, args.expires))


if __name__ == "__main__":
    main()
