"""Mint the load test's identity: a throwaway ES256 key, its JWKS and a token.

The load test runs against the API's real JWKS verification (no test
overrides), so it needs an issuer it controls. This script generates the
key pair, writes `jwks.json` (serve the directory over HTTP as the
`AUTH_JWKS_URL`) and the bearer token (fed to Locust via
`LOADTEST_TOKEN_FILE`). The key lives only in the run's directory - nothing
to keep, nothing secret (ASVS: a load-test identity is not a credential).

Usage (the CI step in .github/workflows/ci.yml wires it end to end):

    python loadtests/mint_token.py --out-dir .loadtest \
      --issuer http://127.0.0.1:8090 --subject loadtest-driver
"""

from __future__ import annotations

import argparse
import base64
import json
import time
from pathlib import Path

import jwt
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def main() -> None:
    parser = argparse.ArgumentParser(description="Mint the load test's JWKS and token")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--issuer", required=True)
    parser.add_argument("--subject", default="loadtest-driver")
    parser.add_argument("--audience", default="courier-api")
    parser.add_argument("--ttl-seconds", type=int, default=3600)
    args = parser.parse_args()

    private_key = ec.generate_private_key(ec.SECP256R1())
    numbers = private_key.public_key().public_numbers()
    kid = "loadtest-" + b64url(numbers.x.to_bytes(32, "big"))[:12]

    jwks = {
        "keys": [
            {
                "kty": "EC",
                "crv": "P-256",
                "kid": kid,
                "use": "sig",
                "alg": "ES256",
                "x": b64url(numbers.x.to_bytes(32, "big")),
                "y": b64url(numbers.y.to_bytes(32, "big")),
            }
        ]
    }

    now = int(time.time())
    token = jwt.encode(
        {
            "sub": args.subject,
            "iss": args.issuer,
            "aud": args.audience,
            "sessionId": "loadtest-session",
            "iat": now,
            "exp": now + args.ttl_seconds,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": kid},
    )

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "jwks.json").write_text(json.dumps(jwks), encoding="utf-8")
    (args.out_dir / "token.txt").write_text(token, encoding="utf-8")
    print(f"wrote {args.out_dir / 'jwks.json'} and {args.out_dir / 'token.txt'} (kid {kid})")


if __name__ == "__main__":
    main()
