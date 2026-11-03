"""BUG-059: the shared fixtures live in conftest.py, exactly once (the pin).

The audit found the same `repo`/`client`/`verifier_key` fixtures and the same
`make_stop`/`make_request` helpers copied into several test modules; a second
definition silently shadows the shared one, so the copies drift apart. This
test scans the API's test modules and refuses any redefinition of a hoisted
name outside `conftest.py`.

Three modules are excepted, each for its own reason (named here so the next
reader does not "fix" them into the hoist):

- `auth/test_voice_socket.py` — its `client` overrides the *websocket* verifier
  (`get_websocket_verifier`) and its `repo` is pre-seeded with the owned shift;
  both are the socket's own, not copies of the HTTP fixtures.
- `auth/test_jwks.py` — it tests the verifier itself, so its `client` takes a
  verifier, not a key pair.
- `test_repo_db.py` — its `repo` is the SQL repo on a real engine, the db leg's
  own fixture.
"""

from __future__ import annotations

import re
from pathlib import Path

HOISTED = (
    "repo",
    "verifier_key",
    "client",
    "other_client",
    "anonymous_client",
    "make_stop",
    "make_request",
)

EXCEPTED = {
    "auth/test_voice_socket.py",
    "auth/test_jwks.py",
    "test_repo_db.py",
}

_DEFINITION = re.compile(rf"^def (?:{'|'.join(HOISTED)})\(")


def test_no_test_module_redefines_a_hoisted_name() -> None:
    tests = Path(__file__).parent
    offenders: list[str] = []
    for path in sorted(tests.rglob("test_*.py")):
        relative = path.relative_to(tests).as_posix()
        if relative in EXCEPTED:
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if _DEFINITION.match(line):
                offenders.append(f"{relative}:{number} ({line.strip()})")
    assert offenders == [], f"hoisted names redefined outside conftest.py: {offenders}"


def test_conftest_defines_every_hoisted_name() -> None:
    conftest = (Path(__file__).parent / "conftest.py").read_text(encoding="utf-8")
    missing = [name for name in HOISTED if f"def {name}(" not in conftest]
    assert missing == [], f"conftest.py does not define: {missing}"
