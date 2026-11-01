"""Tests for the copilot agent (the fast path of the voice commands)."""
from typing import Any

import pytest

from app.agents import copilot


def test_fast_path():
    assert copilot.fast_path("Delivered").tool == "mark_delivered"
    assert copilot.fast_path("left at the side gate").args == {"safe_place": "side gate"}
    assert copilot.fast_path("there's a dog here") is None


# --- BUG-116: one client, an explicit timeout, and a budget -----------------


class TestTheCopilotClient:
    """A fresh client per utterance leaks a pool per utterance and carries the
    SDK's 600 s default, so a slow gateway parks the socket (BUG-116)."""

    def test_the_client_is_built_once_and_shared(self, monkeypatch: pytest.MonkeyPatch) -> None:
        import anthropic

        built = 0
        real_constructor = anthropic.Anthropic

        def counting(*args: Any, **kwargs: Any) -> Any:
            nonlocal built
            built += 1
            return real_constructor(*args, **kwargs)

        monkeypatch.setattr(anthropic, "Anthropic", counting)
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
        copilot._CLIENT_CELL.clear()

        first = copilot._shared_client()
        for _ in range(4):
            copilot._shared_client()

        assert built == 1
        assert first is copilot._CLIENT_CELL["client"]
        copilot._CLIENT_CELL.clear()

    def test_the_client_carries_an_explicit_timeout_and_retries(self) -> None:
        client = copilot._shared_client()
        # The SDK defaults to no timeout at all; 600 s is what parks a socket.
        assert client.timeout == copilot.COPILOT_TIMEOUT_SECONDS
        assert client.max_retries == copilot.COPILOT_MAX_RETRIES
        assert copilot.COPILOT_TIMEOUT_SECONDS <= 60
        assert copilot.COPILOT_MAX_RETRIES <= 3
