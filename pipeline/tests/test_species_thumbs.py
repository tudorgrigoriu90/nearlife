"""Compact thumbnails for the offline pack (T-255)."""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_species_thumbs import PENDING_SQL, THUMB_WIDTH, make_thumb, thumb_args, thumb_path  # noqa: E402

SQL = (Path(__file__).resolve().parents[2] / "supabase" / "migrations" / "20261110000002_species_thumbs.sql").read_text()


def test_thumb_path_is_safe_for_gbif_ids():
    assert thumb_path("gbif:2490266") == "thumbs/gbif-2490266.webp"
    assert thumb_path("moose") == "thumbs/moose.webp"


def test_args_shrink_but_never_upscale():
    args = thumb_args("in.jpg", "out.webp")
    assert args[args.index("-vf") + 1] == "scale='min(200,iw)':-2"
    assert args[args.index("-c:v") + 1] == "libwebp"
    assert args[-1] == "out.webp"


def test_a_changed_photo_gets_a_new_thumbnail():
    assert "thumb_source is distinct from source_url" in PENDING_SQL
    assert "thumb_url" in SQL and "thumb_source" in SQL


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_a_real_photo_becomes_a_small_webp(tmp_path):
    jpg = tmp_path / "p.jpg"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=400x300", "-frames:v", "1", str(jpg)],
        check=True,
    )
    thumb = make_thumb(jpg.read_bytes())
    assert thumb[:4] == b"RIFF" and thumb[8:12] == b"WEBP"
    out = tmp_path / "t.webp"
    out.write_bytes(thumb)
    width = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=width", "-of", "csv=p=0", str(out)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    assert int(width) == THUMB_WIDTH
    assert len(thumb) < 12_000
