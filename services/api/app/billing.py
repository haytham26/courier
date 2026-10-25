"""The billing settings: which sources, and each source's webhook secret.

Env-only, with no fallback: a provider configured without its secret is a
misconfiguration the webhook refuses (ADR-018 §2 rule 1), not a permissive
default. The secrets never reach a log or a response.
"""

from __future__ import annotations

import os
from functools import lru_cache


@lru_cache
def billing_sources() -> frozenset[str]:
    """The sources this deployment accepts (`BILLING_SOURCES`, comma-separated).

    Empty means none: a deployment that has not chosen a billing source refuses
    every webhook rather than guessing which one the founder meant."""
    raw = os.environ.get("BILLING_SOURCES", "")
    return frozenset(item.strip() for item in raw.split(",") if item.strip())


@lru_cache
def webhook_secret(source: str) -> str:
    """The source's signing secret (`BILLING_WEBHOOK_SECRET_<SOURCE>`).

    Read from the environment every call (cached), never from a default: the
    verifier's own rule refuses an empty secret before any comparison."""
    name = f"BILLING_WEBHOOK_SECRET_{source.upper()}"
    return os.environ.get(name, "").strip()
