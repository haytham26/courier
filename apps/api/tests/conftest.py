"""Test environment for the Courier Copilot API.

The API refuses to start without a JWKS endpoint, so the tests provide a
placeholder URL (the verifier is replaced with a mock transport per test).
"""
from __future__ import annotations

import os

os.environ.setdefault("AUTH_JWKS_URL", "http://127.0.0.1:9/api/auth/jwks")
os.environ.setdefault("AUTH_JWT_AUDIENCE", "courier-api")
os.environ.setdefault("AUTH_JWT_ISSUER", "http://localhost:3001")
