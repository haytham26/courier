"""Token verification for Courier Copilot API (Better Auth is the issuer)."""
from .jwks import (
    AuthPrincipal,
    AuthSettings,
    InvalidTokenError,
    JwksVerifier,
    get_auth_settings,
    get_current_principal,
    get_verifier,
)

__all__ = [
    "AuthPrincipal",
    "AuthSettings",
    "InvalidTokenError",
    "JwksVerifier",
    "get_auth_settings",
    "get_current_principal",
    "get_verifier",
]
