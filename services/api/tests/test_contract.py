"""The contract drift guard (queue 2, item 1b).

The app consumes `packages/contracts/openapi.yaml`; the API serves its own
routes. The two may never drift apart again, so this test generates the API's
real OpenAPI surface from FastAPI and diffs it against the contract:

- every route the API serves must be IN the contract (a route the app cannot
  discover is a route that does not exist for it);
- every contract operation not marked `x-status: planned` must be SERVED by
  the API (a path the app codes against that the server ignores is a lie).

Schema details are not diffed (the contract carries descriptions and
constraints the code expresses in validators), but paths, methods and
operation ids are exact.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi.routing import APIRoute
from starlette.routing import WebSocketRoute

from app.main import app

CONTRACT = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "openapi.yaml"

#: FastAPI's own documentation surfaces: they are the framework's, not the
#: contract's, and every client already knows them.
FRAMEWORK_ROUTES = {"/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}


def served_routes() -> dict[tuple[str, str], str]:
    """The API's real routes as (method, path) -> operation id.

    The included routers (this FastAPI version mounts them lazily as
    `_IncludedRouter`) are recursed into, and the WebSocket route is
    reported as a GET (the OpenAPI way to document a socket upgrade).
    """
    served: dict[tuple[str, str], str] = {}

    def walk(routes: list[Any]) -> None:
        for route in routes:
            if isinstance(route, APIRoute):
                if route.path in FRAMEWORK_ROUTES or not route.methods:
                    continue
                for method in sorted(route.methods):
                    if method in ("HEAD", "OPTIONS"):
                        continue
                    served[(method, route.path)] = route.name
            elif isinstance(route, WebSocketRoute):
                served[("GET", route.path)] = route.name
            elif hasattr(route, "original_router"):
                walk(route.original_router.routes)

    walk(app.routes)
    return served


def contract_operations() -> dict[tuple[str, str], str]:
    """The contract's operations as (method, path) -> operation id, with the
    planned-only paths left out (they are declarations, not serves)."""
    document = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
    declared: dict[tuple[str, str], str] = {}
    for path, item in document["paths"].items():
        if item.get("x-status") == "planned":
            continue
        for method, operation in item.items():
            if method.lower() not in ("get", "post", "put", "patch", "delete"):
                continue
            declared[(method.upper(), path)] = operation.get("operationId", "")
    return declared


def test_every_served_route_is_in_the_contract() -> None:
    served = served_routes()
    contract_paths = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))["paths"]
    missing = [
        (method, path)
        for (method, path) in served
        if path not in contract_paths or method.lower() not in contract_paths[path]
    ]
    assert missing == [], (
        "routes the API serves that the contract does not declare "
        f"(the app cannot discover them): {missing}"
    )


def test_every_contract_operation_is_served() -> None:
    served = served_routes()
    declared = contract_operations()
    unserved = [(method, path) for (method, path) in declared if (method, path) not in served]
    assert unserved == [], (
        "operations the contract declares (not x-status: planned) that the API does not serve: "
        f"{unserved}"
    )


def test_a_planned_path_is_not_served() -> None:
    """The contract cannot UNDERSTATE a serving API either: a path marked
    planned must have no real route behind it (the review's follow-up)."""
    document = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
    served = served_routes()
    planned_served = [
        (method.upper(), path)
        for path, item in document["paths"].items()
        if item.get("x-status") == "planned"
        for method in item
        if method.lower() in ("get", "post", "put", "patch", "delete")
        if (method.upper(), path) in served
    ]
    assert planned_served == [], f"paths marked planned but actually served: {planned_served}"


def test_the_operation_ids_match() -> None:
    served = served_routes()
    declared = contract_operations()
    drifted = [
        (method, path, declared[(method, path)], served[(method, path)])
        for (method, path) in declared
        if (method, path) in served
        and declared[(method, path)]
        and declared[(method, path)] != served[(method, path)]
    ]
    assert drifted == [], f"operation ids drifted between the contract and the API: {drifted}"


def test_the_guard_itself_is_not_vacuous() -> None:
    """The drift guard must be able to fail: it discovers real routes and
    reads a real contract, and an unknown path is not in the contract."""
    served = served_routes()
    assert served, "no routes discovered: the guard would pass forever"
    assert all(name for name in served.values())
    contract_paths = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))["paths"]
    assert "/definitely-not-a-route" not in contract_paths
    assert ("/POST", "/definitely-not-a-route") not in served
