"""Catalogue-wide photo sourcing (T-202) — the pure parts."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_species_photos import (  # noqa: E402
    CURATED_SQL,
    curated_rows,
    media_row,
    pending_targets,
    public_url,
    storage_path,
)
from media.licenses import app_license  # noqa: E402

FOUND = {
    "imageUrl": "https://upload.wikimedia.org/x/400px-Y.jpg",
    "license": "CC BY-SA 4.0",
    "author": "A. Photographer",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Y.jpg",
}


def test_storage_path_is_safe_for_gbif_ids():
    assert storage_path("gbif:2490266") == "gbif-2490266.jpg"
    assert storage_path("great-tit") == "great-tit.jpg"


def test_public_url_points_at_the_species_media_bucket():
    assert public_url("https://x.supabase.co/", "a.jpg") == "https://x.supabase.co/storage/v1/object/public/species-media/a.jpg"


def test_targets_go_most_observed_first_and_skip_what_is_done_or_unknown():
    included = [
        {"speciesKey": 1, "scientificName": "Rare one", "occurrences": 5},
        {"speciesKey": 2, "scientificName": "Common one", "occurrences": 5000},
        {"speciesKey": 3, "scientificName": "Already done", "occurrences": 9000},
        {"speciesKey": 4, "scientificName": "Not in the database", "occurrences": 100},
    ]
    ids = {1: "gbif:1", 2: "gbif:2", 3: "great-tit"}
    targets = pending_targets(included, ids, {"great-tit"})
    assert [t["speciesId"] for t in targets] == ["gbif:2", "gbif:1"]


def test_a_photo_row_carries_its_attribution_in_the_app_licence_form():
    row = media_row("gbif:1", FOUND, "https://host/gbif-1.jpg")
    assert row == {
        "species_id": "gbif:1",
        "url": "https://host/gbif-1.jpg",
        "source_url": FOUND["sourceUrl"],
        "author": "A. Photographer",
        "license": "CC-BY-SA",
    }


def test_no_photo_or_an_unsafe_licence_is_recorded_as_a_miss_not_retried_forever():
    miss = {"species_id": "gbif:1", "url": None, "source_url": None, "author": None, "license": None}
    assert media_row("gbif:1", None, None) == miss
    assert media_row("gbif:1", {**FOUND, "license": "CC BY-NC 4.0"}, "https://host/x.jpg") == miss
    assert media_row("gbif:1", FOUND, None) == miss  # upload did not happen


def test_curated_rows_reuse_the_photos_already_hosted_and_are_never_overwritten():
    manifest = {
        "media": [
            {"speciesId": "great-tit", "imageUrl": "u", "appLicense": "CC-BY-SA", "author": "C. Sharp",
             "sourceUrl": "s", "ext": "jpg"},
            {"speciesId": "no-photo", "imageUrl": None},
        ]
    }
    rows = curated_rows(manifest, "https://x.supabase.co")
    assert rows == [{
        "species_id": "great-tit",
        "url": "https://x.supabase.co/storage/v1/object/public/species-media/great-tit.jpg",
        "source_url": "s",
        "author": "C. Sharp",
        "license": "CC-BY-SA",
    }]
    assert "do nothing" in CURATED_SQL


def test_app_licence_mapping():
    assert app_license("CC0 1.0") == "CC0"
    assert app_license("Public domain") == "CC0"
    assert app_license("CC BY 4.0") == "CC-BY"
    assert app_license("CC BY-SA 3.0") == "CC-BY-SA"
    assert app_license("CC BY-NC-SA 2.0") is None
    assert app_license("CC BY-ND 4.0") is None
    assert app_license("GFDL") is None
    assert app_license(None) is None
