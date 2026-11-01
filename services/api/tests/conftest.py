"""Test environment for the Courier Copilot API.

The API refuses to start without a JWKS endpoint, so the tests provide a
placeholder URL (the verifier is replaced with a mock transport per test).
"""
from __future__ import annotations

import os

os.environ.setdefault("AUTH_JWKS_URL", "http://127.0.0.1:9/api/auth/jwks")
os.environ.setdefault("AUTH_JWT_AUDIENCE", "courier-api")
os.environ.setdefault("AUTH_JWT_ISSUER", "http://localhost:3001")
# The local POD store refuses to boot without a real signing key; tests get a
# fixed throwaway one (the forged-grant test uses a different key on purpose).
os.environ.setdefault(
    "POD_URL_SIGNING_SECRET", "test-only-pod-url-signing-secret-0123456789"
)
# The copilot's client is built lazily on first use (BUG-116), so the agent
# tests need a placeholder key - the real gateway is never called (the tests
# pass their own client, and the socket's loop is tested with a fallback).
os.environ.setdefault("ANTHROPIC_API_KEY", "test-only-placeholder")
