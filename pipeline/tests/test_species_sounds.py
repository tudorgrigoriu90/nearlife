"""Bird song sourcing (T-245) — the pure parts, the licence rule above all."""

import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_species_sounds import bird_targets, is_hybrid, make_clip, sound_path, sound_row  # noqa: E402
from media.inat_sounds import CLIP_SECONDS, clip_args, pick_sound  # noqa: E402

SQL = (Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261105000001_species_sounds.sql").read_text()


def obs(oid, taxon_id, sounds, ancestors=(), name="Rec Ordist", login="rec"):
    return {
        "id": oid,
        "taxon": {"id": taxon_id, "ancestor_ids": list(ancestors)},
        "user": {"name": name, "login": login},
        "sounds": sounds,
    }


def snd(code, url="https://static.inaturalist.org/sounds/1.wav"):
    return {"license_code": code, "file_url": url}


def test_nc_nd_and_unlicensed_sounds_never_ship():
    for code in ("cc-by-nc", "cc-by-nc-sa", "cc-by-nd", "cc-by-nc-nd", None, ""):
        assert pick_sound([obs(1, 7, [snd(code)])], 7) is None


def test_the_first_safe_sound_ships_with_its_recordist_and_observation():
    found = pick_sound([obs(1, 7, [snd("cc-by-nc")]), obs(2, 7, [snd("cc-by-sa")], name="")], 7)
    assert found == {
        "fileUrl": "https://static.inaturalist.org/sounds/1.wav",
        "license": "CC-BY-SA",
        "author": "rec",
        "sourceUrl": "https://www.inaturalist.org/observations/2",
    }
    assert pick_sound([obs(3, 7, [snd("cc0")])], 7)["license"] == "CC0"


def test_a_sound_without_a_file_or_of_another_taxon_is_skipped():
    assert pick_sound([obs(1, 7, [snd("cc-by", url=None)])], 7) is None
    assert pick_sound([obs(1, 8, [snd("cc-by")])], 7) is None
    # A subspecies observation is the species.
    assert pick_sound([obs(1, 99, [snd("cc-by")], ancestors=[1, 7])], 7) is not None


def test_clip_is_twenty_seconds_mono_aac_with_a_fade():
    args = clip_args("in.wav", "out.m4a")
    assert args[0] == "ffmpeg" and args[-1] == "out.m4a"
    assert args[args.index("-t") + 1] == str(CLIP_SECONDS)
    assert args[args.index("-ac") + 1] == "1"
    assert args[args.index("-c:a") + 1] == "aac"
    assert "afade=t=out" in args[args.index("-af") + 1]


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_make_clip_really_cuts_a_long_recording(tmp_path):
    wav = tmp_path / "long.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=3000:duration=60", str(wav)],
        check=True,
    )
    clip = make_clip(wav.read_bytes())
    out = tmp_path / "c.m4a"
    out.write_bytes(clip)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=channels", "-of", "default=nw=1", str(out)],
        capture_output=True, text=True, check=True,
    ).stdout
    assert float(re.search(r"duration=([\d.]+)", probe).group(1)) <= CLIP_SECONDS + 0.2
    assert "channels=1" in probe
    assert len(clip) < 250_000


def test_hybrids_are_not_birds_to_record():
    assert is_hybrid("Anas acuta x platyrhynchos")
    assert is_hybrid("Motacilla citreola x  flava")
    assert not is_hybrid("Anas acuta")


def test_targets_are_birds_most_observed_first():
    included = [
        {"speciesKey": 1, "scientificName": "Rare bird", "taxon": "birds", "occurrences": 5},
        {"speciesKey": 2, "scientificName": "Common bird", "taxon": "birds", "occurrences": 5000},
        {"speciesKey": 3, "scientificName": "A beetle", "taxon": "insects", "occurrences": 9000},
        {"speciesKey": 4, "scientificName": "Anas acuta x platyrhynchos", "taxon": "birds", "occurrences": 900},
        {"speciesKey": 5, "scientificName": "Done bird", "taxon": "birds", "occurrences": 800},
        {"speciesKey": 6, "scientificName": "Not in the database", "taxon": "birds", "occurrences": 700},
    ]
    ids = {1: "gbif:1", 2: "gbif:2", 3: "gbif:3", 4: "gbif:4", 5: "gbif:5"}
    assert [t["speciesId"] for t in bird_targets(included, ids, {"gbif:5"})] == ["gbif:2", "gbif:1"]


def test_sound_path_and_rows():
    assert sound_path("gbif:2490266") == "sounds/gbif-2490266.m4a"
    miss = sound_row("gbif:1", None, None)
    assert miss["url"] is None and miss["license"] is None
    found = {"license": "CC-BY", "sourceUrl": "https://www.inaturalist.org/observations/2", "author": ""}
    row = sound_row("gbif:1", found, "https://x/s.m4a")
    assert row == {
        "species_id": "gbif:1",
        "url": "https://x/s.m4a",
        "source_url": "https://www.inaturalist.org/observations/2",
        "author": "Unknown",
        "license": "CC-BY",
    }


def test_table_allows_only_safe_licences_and_is_read_only_for_clients():
    assert "license in ('CC0', 'CC-BY', 'CC-BY-SA')" in SQL
    assert "check ((url is null) = (license is null))" in SQL
    assert "enable row level security" in SQL
    assert "for select to anon, authenticated using (true)" in SQL
    assert not re.search(r"for (insert|update|delete|all)", SQL)
