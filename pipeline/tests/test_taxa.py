"""Tests for the target-taxa configuration."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbif.taxa import TARGET_TAXA  # noqa: E402


def test_every_taxon_has_required_fields():
    for t in TARGET_TAXA:
        assert t["key"] and isinstance(t["key"], str)
        assert isinstance(t["names"], list) and t["names"]
        assert all(isinstance(n, str) and n for n in t["names"])
        assert isinstance(t["facetLimit"], int) and t["facetLimit"] > 0
        assert isinstance(t["minOccurrences"], int) and t["minOccurrences"] >= 0


def test_keys_are_unique():
    keys = [t["key"] for t in TARGET_TAXA]
    assert len(set(keys)) == len(keys)


def test_covers_fauna_and_flora():
    names = {n for t in TARGET_TAXA for n in t["names"]}
    assert {"Aves", "Mammalia", "Amphibia"} <= names  # vertebrates
    assert {"Squamata", "Testudines"} <= names  # reptiles (GBIF backbone grouping)
    assert "Esociformes" in names  # fish by order (no fish class in GBIF backbone)
    assert {"Insecta", "Arachnida", "Mollusca"} <= names  # invertebrates
    assert "Tracheophyta" in names  # flora
