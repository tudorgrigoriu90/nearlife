"""T-220: iNaturalist as the second photo source, for species Wikipedia had no usable photo for."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media.inaturalist import author_of, pick_photo, sized, taxon_match  # noqa: E402
from media.licenses import inat_license  # noqa: E402


def photo(pid, code, attribution="(c) Jane Doe, some rights reserved (CC BY)", **extra):
    return {
        "id": pid,
        "license_code": code,
        "attribution": attribution,
        "url": f"https://inaturalist-open-data.s3.amazonaws.com/photos/{pid}/square.jpg",
        **extra,
    }


def test_only_commercial_safe_inaturalist_licences_ship():
    assert inat_license("cc0") == "CC0"
    assert inat_license("cc-by") == "CC-BY"
    assert inat_license("CC-BY-SA") == "CC-BY-SA"
    for code in ("cc-by-nc", "cc-by-nd", "cc-by-nc-sa", "cc-by-nc-nd", None, "", "all rights reserved"):
        assert inat_license(code) is None


def test_the_taxon_must_be_the_species_asked_for():
    results = [
        {"id": 1, "name": "Parus", "rank": "genus"},
        {"id": 2, "name": "Parus major", "rank": "species"},
    ]
    assert taxon_match(results, "Parus major")["id"] == 2
    assert taxon_match(results, "parus  major")["id"] == 2


def test_a_synonym_matches_through_the_matched_term():
    results = [{"id": 3, "name": "Cyanistes caeruleus", "rank": "species", "matched_term": "Parus caeruleus"}]
    assert taxon_match(results, "Parus caeruleus")["id"] == 3


def test_a_different_species_is_never_taken_as_a_match():
    assert taxon_match([{"id": 4, "name": "Parus minor", "rank": "species"}], "Parus major") is None
    assert taxon_match([], "Parus major") is None


def test_the_first_commercial_safe_photo_wins():
    photos = [photo(10, "cc-by-nc"), photo(11, None), photo(12, "cc-by-sa"), photo(13, "cc0")]
    assert pick_photo(photos)["id"] == 12
    assert pick_photo([photo(10, "cc-by-nc")]) is None


def test_the_medium_size_is_requested_not_the_75px_square():
    assert sized(photo(12, "cc-by")) == "https://inaturalist-open-data.s3.amazonaws.com/photos/12/medium.jpg"
    assert sized(photo(12, "cc-by", medium_url="https://x/12/medium.jpeg")) == "https://x/12/medium.jpeg"


def test_the_author_is_the_name_from_the_attribution():
    assert author_of(photo(1, "cc-by")) == "Jane Doe"
    assert author_of(photo(1, "cc0", attribution="Jon Smith, no rights reserved (CC0)")) == "Jon Smith"
    assert author_of(photo(1, "cc-by", attribution_name="J. D.")) == "J. D."
    assert author_of(photo(1, "cc-by", attribution="")) == "Unknown"
