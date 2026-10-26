"""Generate the typed API client from the contract, and check it is fresh.

The app must not hand-write fetch calls against a contract the drift guard already
pins. This script reads `packages/contracts/openapi.yaml` and writes
`packages/shared/src/generated/api.ts` - one interface per schema, one typed
signature per operation - so the phone consumes the same file the server is
checked against.

Usage (the argument is relative to services/api, because `uv run --directory`
makes it the cwd - the convention the restore drill and the load test use):

    uv run --directory services/api python scripts/generate_api_client.py
    uv run --directory services/api python scripts/generate_api_client.py check

The second is the CI gate: it regenerates into a temporary file beside the
committed one and diffs. A contract change that leaves a stale client is red, the
same way a contract change that leaves a stale server is - the third direction of
the drift guard.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
CONTRACT = REPO_ROOT / "packages" / "contracts" / "openapi.yaml"
OUTPUT = REPO_ROOT / "packages" / "shared" / "src" / "generated" / "api.ts"

HEADER = """/**
 * The typed API client, generated from packages/contracts/openapi.yaml.
 *
 * DO NOT EDIT: change the contract and regenerate
 * (`uv run --directory services/api python scripts/generate_api_client.py`).
 * CI fails on a stale file (the same script's `check` mode), so the server, the
 * contract and this client cannot drift apart.
 */
"""

#: The JSON Schema types this contract uses, as TypeScript. `null` belongs here
#: too: the contract is OpenAPI 3.1, where `type: 'null'` is a first-class type
#: and a union member that means "absent".
_SCALARS = {
    "string": "string",
    "integer": "number",
    "number": "number",
    "boolean": "boolean",
    "null": "null",
}


def ref_name(ref: str) -> str:
    """The schema name a `$ref` points at."""
    return ref.rsplit("/", 1)[-1]


def ts_type(schema: dict, indent: str = "") -> str:
    """The TypeScript type of one schema fragment."""
    if "$ref" in schema:
        return ref_name(schema["$ref"])
    if "enum" in schema or "oneOf" in schema:
        return _union_type(schema, indent)
    variants = schema.get("type") or ""
    if isinstance(variants, list):
        parts = ["null"] if "null" in variants else []
        parts += [_SCALARS.get(v, "unknown") for v in variants if v != "null"]
        return " | ".join(dict.fromkeys(parts))
    if variants == "array":
        return f"{ts_type(schema.get('items', {}), indent)}[]"
    if variants == "object":
        return _object_type(schema, indent)
    return _SCALARS.get(variants, "unknown")


def _union_type(schema: dict[str, Any], indent: str) -> str:
    """An enum's literals or a oneOf's members, as one TypeScript union."""
    if "enum" in schema:
        return " | ".join(json.dumps(value) for value in schema["enum"])
    return " | ".join(ts_type(part, indent) for part in schema["oneOf"])


def _object_type(schema: dict, indent: str) -> str:
    """An object schema as an inline type, or a record when it has no fields."""
    nested = schema.get("properties")
    if schema.get("additionalProperties") is True or not nested:
        return "Record<string, unknown>"
    required = set(schema.get("required", []))
    fields = [
        f"{indent}  {name}{'' if name in required else '?'}: {ts_type(child, indent + '  ')};"
        for name, child in nested.items()
    ]
    return "\n".join(["{", *fields, f"{indent}}}"])


def schema_interface(name: str, schema: dict) -> str:
    """One component schema as an exported interface."""
    properties = schema.get("properties")
    if not properties:
        return f"export type {name} = {ts_type(schema)};\n"
    required = set(schema.get("required", []))
    lines = [f"export interface {name} {{"]
    for field, child in properties.items():
        optional = "" if field in required else "?"
        lines.append(f"  {field}{optional}: {ts_type(child, '  ')};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def path_entry(method: str, operation: dict) -> str:
    """One operation as the request it takes and the answers it gives."""
    request = operation.get("requestBody", {})
    content = request.get("content", {}).get("application/json", {}).get("schema", {})
    body = ts_type(content) if content else "null"
    answers = []
    for status, response in sorted(operation.get("responses", {}).items()):
        if status.startswith("2") and "content" in response:
            reply = response["content"].get("application/json", {}).get("schema", {})
            answers.append("      " + status + ": " + ts_type(reply) + ";")
    lines = ["    " + method + ": {", "      body: " + body + ";"]
    if answers:
        lines.append("    responses: {")
        lines.extend(answers)
        lines.append("    };")
    lines.append("    };")
    return "\n".join(lines)


def prettier(path: Path) -> None:
    """Make the generated file prettier-clean, so the committed file is stable.

    The freshness check is an exact diff, so the generator's output must be the
    file the repo's own formatter would leave: a file that drifts only because
    of formatting is a red gate with nothing behind it.

    When prettier cannot be found the check still runs, compares unformatted
    output against the formatted file and fails: a missing formatter makes the
    gate red, never silently green.

    No shell is involved: on Windows the `.cmd` launcher is run by `cmd /c`, and
    everywhere else the executable is run directly. The command carries nothing
    but the paths this script derived itself.
    """
    import shutil
    import sys

    if sys.platform == "win32":
        # The extension-less `prettier` in node_modules/.bin is a shell script,
        # which Windows cannot execute directly; the `.cmd` launcher can, if the
        # shell is asked for it rather than spawned around it.
        candidates = [
            shutil.which("prettier.cmd"),
            str(REPO_ROOT / "node_modules" / ".bin" / "prettier.cmd"),
        ]
        executable = next((item for item in candidates if item and Path(item).exists()), None)
        if executable is None:
            print("check-api-client: prettier not found, the client will not be formatted")
            return
        command = ["cmd", "/c", executable, "--write", str(path)]
    else:
        executable = shutil.which("prettier") or str(
            REPO_ROOT / "node_modules" / ".bin" / "prettier"
        )
        if not Path(executable).exists():
            print("check-api-client: prettier not found, the client will not be formatted")
            return
        command = [executable, "--write", str(path)]

    subprocess.run(command, check=False, capture_output=True)


def generate() -> str:
    """The whole client file, as text."""
    contract = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
    schemas: dict[str, dict] = contract.get("components", {}).get("schemas", {})
    paths: dict[str, dict] = contract.get("paths", {})

    parts = [HEADER]
    parts.extend(schema_interface(name, schemas[name]) for name in sorted(schemas))

    entries = []
    for path, methods in paths.items():
        lines = [f"  {json.dumps(path)}: {{"]
        for method, operation in methods.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            lines.append(path_entry(method, operation))
        lines.append("  };")
        entries.append("\n".join(lines))
    parts.append(
        "/** Every served route, keyed by path, with its request and answers. */\n"
        "export interface ApiPaths {\n" + "\n".join(entries) + "\n}\n"
    )
    parts.append(
        "/** The app's base URL comes from the build config; the paths are typed here. */\n"
        "export type ApiMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';\n"
    )
    return "\n".join(part.rstrip("\n") + "\n" for part in parts)


def main() -> int:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(generate(), encoding="utf-8", newline="")
    prettier(OUTPUT)
    print(f"generate-api-client: wrote {OUTPUT.relative_to(REPO_ROOT)}")
    return 0


def check() -> int:
    """Regenerate into a temporary file and diff: a stale client is red."""
    if not OUTPUT.exists():
        print(f"check-api-client: {OUTPUT.relative_to(REPO_ROOT)} is missing")
        return 1
    # The temp file lives beside the real one: prettier resolves its config from
    # the file's directory, so a file elsewhere would format differently and the
    # check would complain about formatting rather than about the contract.
    fresh = OUTPUT.parent / ".api-check.ts"
    fresh.write_text(generate(), encoding="utf-8", newline="")
    prettier(fresh)
    actual = OUTPUT.read_text(encoding="utf-8")
    if actual == fresh.read_text(encoding="utf-8"):
        print("check-api-client: the client is fresh")
        fresh.unlink(missing_ok=True)
        return 0
    diff = subprocess.run(
        ["git", "diff", "--no-index", "--", str(OUTPUT), str(fresh)],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    fresh.unlink(missing_ok=True)
    print("check-api-client: the client is stale (regenerate it)")
    print(diff.stdout[:4000])
    return 1


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "generate"
    raise SystemExit(main() if command == "generate" else check())
