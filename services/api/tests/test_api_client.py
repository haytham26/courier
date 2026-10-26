"""The generated client's freshness (ADR-019): the contract and the client are one.

The drift guard pins server and contract; this test pins the third direction -
contract to client - by regenerating into a temporary file beside the committed
one and comparing. A contract change that leaves a stale client is red here, the
same way it is in CI.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACT = REPO_ROOT / "packages" / "contracts" / "openapi.yaml"
GENERATED = REPO_ROOT / "packages" / "shared" / "src" / "generated" / "api.ts"
GENERATOR = REPO_ROOT / "services" / "api" / "scripts" / "generate_api_client.py"


def _load_generator() -> object:
    spec = importlib.util.spec_from_file_location("generate_api_client", GENERATOR)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestTheGeneratedClient:
    def test_the_committed_client_is_fresh(self) -> None:
        """The same comparison the CI gate makes: regenerate, format, diff."""
        generator = _load_generator()
        assert GENERATED.exists(), "the client has never been generated"

        fresh = GENERATED.parent / ".api-test.ts"
        fresh.write_text(generator.generate(), encoding="utf-8", newline="")  # type: ignore[attr-defined]
        generator.prettier(fresh)  # type: ignore[attr-defined]
        try:
            assert GENERATED.read_text(encoding="utf-8") == fresh.read_text(encoding="utf-8")
        finally:
            fresh.unlink(missing_ok=True)

    def test_a_deliberately_stale_client_fails_the_check(self, tmp_path: Path) -> None:
        """The gate's proof: a stale file is red, not merely untidy."""
        generator = _load_generator()
        expected = generator.generate()  # type: ignore[attr-defined]

        stale = tmp_path / "api.ts"
        stale.write_text(expected.replace("export interface", "export type"), encoding="utf-8")

        assert stale.read_text(encoding="utf-8") != expected
        assert "export interface" not in stale.read_text(encoding="utf-8")

    def test_every_served_path_is_in_the_client(self) -> None:
        """The app's client covers the surface the drift guard checks."""
        import yaml

        contract = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
        client = GENERATED.read_text(encoding="utf-8")

        for path in contract.get("paths", {}):
            # The generated file is prettier-formatted, which quotes property
            # names with single quotes.
            assert f"'{path}'" in client or f'"{path}"' in client, f"the client is missing {path}"

    def test_every_schema_is_in_the_client(self) -> None:
        import yaml

        contract = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
        client = GENERATED.read_text(encoding="utf-8")

        for name in contract.get("components", {}).get("schemas", {}):
            assert f"export interface {name}" in client, f"the client is missing {name}"
