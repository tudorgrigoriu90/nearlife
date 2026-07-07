"""Tests for the target-taxa configuration."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.taxa import TARGET_TAXA  # noqa: E402


def test_every_taxon_has_required_fields():
    for t in TARGET_TAXA:
        assert t["key"] and isinstance(t["key"], str)
        assert t["scientificName"] and isinstance(t["scientificName"], str)
        assert t["rank"] in {"CLASS", "ORDER", "SUPERFAMILY", "GENUS", "PHYLUM", "FAMILY"}
        assert isinstance(t["facetLimit"], int) and t["facetLimit"] > 0
        assert isinstance(t["minOccurrences"], int) and t["minOccurrences"] >= 0


def test_keys_are_unique():
    keys = [t["key"] for t in TARGET_TAXA]
    assert len(set(keys)) == len(keys)


def test_covers_fauna_and_flora():
    names = {t["scientificName"] for t in TARGET_TAXA}
    # Vertebrates, invertebrates, and flora are all represented.
    assert {"Aves", "Mammalia", "Amphibia", "Reptilia", "Actinopterygii"} <= names  # vertebrates
    assert {"Insecta", "Arachnida", "Mollusca"} <= names  # invertebrates
    assert "Tracheophyta" in names  # flora
