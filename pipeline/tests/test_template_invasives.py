"""T-054: the generated give advice (one template per taxon group, used for every species without
curated content) never names a species to plant or release. Mirrors lib/species/invasiveAdvice.test.ts."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from media import content_templates  # noqa: E402

PROMOTES = ("plant ", "sow ", "release ", "introduce ")


def _templates():
    for name in dir(content_templates):
        value = getattr(content_templates, name)
        if isinstance(value, dict):
            for group, entry in value.items():
                if isinstance(entry, dict) and "give" in entry:
                    yield group, entry["give"]


def test_templates_exist():
    assert len(list(_templates())) >= 5


def test_give_templates_name_no_species_to_plant_or_release():
    # "plant a variety of pollinator-friendly flowers" is generic; naming one is not allowed.
    for group, give in _templates():
        lowered = give.lower()
        for verb in PROMOTES:
            if verb in lowered:
                following = lowered.split(verb, 1)[1].split(",")[0]
                assert any(w in following for w in ("a variety", "native", "local")), (group, give)
