"""Smoke test proving the pipeline test harness runs (pytest)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from run import pipeline_ok  # noqa: E402


def test_pipeline_ok() -> None:
    assert pipeline_ok() is True
