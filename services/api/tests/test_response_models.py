"""Every served answer has a shape, not just a type (B3's `response_model`).

The contract drift guard (`test_contract.py`) pins which paths and methods the
server serves. This test pins what each of them *promises*: a 2xx whose body is
a real model — named properties or a `$ref` — because a handler that returns
`dict[str, Any]` answers `{"type": "object"}`, unconstrained, so any key rename
in the answer ships green and the app's typed client is generated as `unknown`.

The app's client is generated from this same surface (`packages/shared/src/
generated/api.ts`, and the freshness gate over it), so the shape declared here
is the shape the phone compiles against.
"""

from __future__ import annotations

from typing import Any

from app.main import app

#: The framework's own documentation surfaces: not part of the contract.
FRAMEWORK_ROUTES = {"/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}

#: The one operation whose body is not JSON: the local POD store streams the
#: photo's own bytes (`Response(content=...)`), and the contract declares it as
#: `image/*: { type: string, format: binary }`. Demanding a JSON schema for an
#: image would fail for the right reason and prove nothing.
NON_JSON_OPERATIONS = {("GET", "/runs/{run_id}/pod/{event_id}/bytes")}


def json_operations() -> list[tuple[str, str, dict[str, Any]]]:
    """Every served operation that answers JSON, as (method, path, operation)."""
    found: list[tuple[str, str, dict[str, Any]]] = []
    for path, methods in app.openapi().get("paths", {}).items():
        if path in FRAMEWORK_ROUTES:
            continue
        for method, operation in methods.items():
            upper = method.upper()
            if upper not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                continue
            if (upper, path) in NON_JSON_OPERATIONS:
                continue
            found.append((upper, path, operation))
    return found


def success_bodies(operation: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """The operation's 2xx responses that carry an application/json body."""
    bodies: list[tuple[str, dict[str, Any]]] = []
    for status, answer in operation.get("responses", {}).items():
        if not str(status).startswith("2"):
            continue
        content = answer.get("content", {}).get("application/json", {})
        if "schema" in content:
            bodies.append((status, content["schema"]))
    return bodies


def is_a_real_model(schema: dict[str, Any]) -> bool:
    """Whether the schema is a named model or an object with named properties.

    A `list[Model]` answers `{"type": "array", "items": {"$ref": ...}}`, so the
    reference one level down counts: the phone's client still gets a typed array
    of the model, not an array of `unknown`.
    """
    if "$ref" in schema or "anyOf" in schema or "oneOf" in schema:
        return True
    if "properties" in schema:
        return True
    items = schema.get("items", {})
    return isinstance(items, dict) and ("$ref" in items or "properties" in items)


def test_every_operation_declares_its_response_schema() -> None:
    """The whole surface, in one answer: no operation may answer `object`."""
    shapeless: list[str] = []
    for method, path, operation in json_operations():
        bodies = success_bodies(operation)
        if not bodies:
            shapeless.append(f"{method} {path}: no 2xx JSON body at all")
            continue
        for status, schema in bodies:
            if not is_a_real_model(schema):
                shapeless.append(f"{method} {path} ({status})")
    assert not shapeless, (
        "these operations answer an unconstrained object: declare a response "
        "model so a key rename is red\n  " + "\n  ".join(shapeless)
    )


def test_the_guard_itself_is_not_vacuous() -> None:
    """The guard must be able to fail, and it must have found a real surface."""
    operations = json_operations()
    assert operations, "no operations discovered: the guard would pass forever"
    # The app's own routes are 19; the auth router's ride on the same OpenAPI.
    assert len(operations) >= 19
    # Every one of them answers a named model, which is what the test above
    # asserts - so the guard is checking something, not nothing.
    named = sum(
        1
        for _method, _path, operation in operations
        for _status, schema in success_bodies(operation)
        if is_a_real_model(schema)
    )
    assert named == len(operations)


def test_a_handler_without_a_model_is_caught() -> None:
    """The proof the guard works: the same check over a synthetic operation.

    A route decorated with no `response_model` and a `dict[str, Any]` return is
    exactly the shape this slice removed, so the guard is run against one to
    show it names it.
    """
    from fastapi import FastAPI

    bare = FastAPI()

    @bare.get("/bare")
    def bare_handler() -> dict[str, Any]:  # no response_model: the old shape
        return {"whatever": 1}

    schema = bare.openapi()["paths"]["/bare"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    assert not is_a_real_model(schema), "the guard would not notice the old shape"
    with_models = app.openapi()["paths"]["/healthz"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    assert is_a_real_model(with_models)


def test_the_documented_models_match_the_responses_module() -> None:
    """The models the OpenAPI names are the ones `app.responses` declares.

    A `$ref` that points at a schema the module does not define would mean the
    document and the code drifted apart, which is the class of bug this slice
    exists to close.
    """
    components = app.openapi().get("components", {}).get("schemas", {})
    from app import responses

    expected = {
        name
        for name, value in vars(responses).items()
        if isinstance(value, type) and hasattr(value, "model_fields") and value.__module__ == responses.__name__
    }
    missing = sorted(name for name in expected if name not in components)
    assert not missing, f"models declared but absent from the OpenAPI: {missing}"
    # And the other way round for the ones the operations reference.
    referenced = {
        schema["$ref"].rsplit("/", 1)[-1]
        for _method, _path, operation in json_operations()
        for _status, schema in success_bodies(operation)
        if "$ref" in schema
    }
    for name in referenced:
        assert name in components, f"the document references an unknown schema: {name}"


def test_the_version_the_smoke_test_proves_comes_from_the_environment() -> None:
    """`APP_VERSION` is what the deploy just deployed (A5's version check).

    The app answered a hard-coded `0.1.0` while the compose file already passed
    `APP_VERSION` to the container, so the smoke test's version check compared
    the deployed sha against a constant: it could never prove the swap, and a
    stale replica behind the edge looked identical to the new one.

    The build of the app object is a fresh subprocess, not a reload of this
    one: reloading `app.main` in-process leaves the websocket routes holding the
    previous module's `app`, which the voice-socket tests then trip over.
    """
    import json
    import os
    import subprocess
    import sys

    deployed = "a-sha-the-deploy-just-shipped"
    original = os.environ.get("APP_VERSION")
    # The override is built and kept: popping it afterwards would remove the
    # very value this test is trying to prove travels.
    environment = {**os.environ, "APP_VERSION": deployed}
    try:
        completed = subprocess.run(
            [
                sys.executable,
                "-c",
                "from app.main import app; print(app.version)",
            ],
            capture_output=True,
            text=True,
            env=environment,
            timeout=120,
            check=True,
        )
        assert completed.stdout.strip() == deployed

        # And with no variable at all, the development default still answers: a
        # boot with no version is a boot that cannot be identified.
        without = {**os.environ}
        without.pop("APP_VERSION", None)
        fallback = subprocess.run(
            [sys.executable, "-c", "from app.main import app; print(app.version)"],
            capture_output=True,
            text=True,
            env=without,
            timeout=120,
            check=True,
        )
        assert fallback.stdout.strip() == "0.1.0"

        # The health answer is a real shape, not a bare object, so the version
        # travels inside the model the contract declares.
        health = json.loads(
            subprocess.run(
                [
                    sys.executable,
                    "-c",
                    "from app.main import app; import json;"
                    "print(json.dumps(app.openapi()['paths']['/healthz']['get']"
                    "['responses']['200']['content']['application/json']['schema']))",
                ],
                capture_output=True,
                text=True,
                env=environment,
                timeout=120,
                check=True,
            ).stdout
        )
        assert "$ref" in health
    finally:
        if original is None:
            os.environ.pop("APP_VERSION", None)
        else:
            os.environ["APP_VERSION"] = original
