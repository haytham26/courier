"""Tests for the copilot agent (the fast path of the voice commands)."""
from app.agents import copilot


def test_fast_path():
    assert copilot.fast_path("Delivered").tool == "mark_delivered"
    assert copilot.fast_path("left at the side gate").args == {"safe_place": "side gate"}
    assert copilot.fast_path("there's a dog here") is None
