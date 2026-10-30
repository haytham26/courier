"""The LINZ data pipeline writes where the accuracy suite reads (C3, red-first).

`scripts/data/fetch-linz.py` and `scripts/data/build-linz-index.py` computed
their repository root one parent short (`Path(__file__).parent.parent` from
`scripts/data/` is `scripts/`), so both wrote into `scripts/data/linz/`, while
`tests/test_linz_accuracy.py` reads the index from `data/linz/`. The pipeline
therefore ran, the index never landed where the suite looks, and the accuracy
test skipped itself with "the LINZ index is not built" - which reads as "the
founder's data never arrived" instead of "the path is wrong".

The proof that this is the mechanism and not a theory: `git status` in the
worktree showed `?? scripts/data/linz/` as UNTRACKED, although `.gitignore`
lists `data/linz/`. A pipeline whose output is untracked-but-not-ignored is one
step away from committing 600 MB of address data.

This test loads the three scripts by path (they are tools, not an importable
package) and asserts the one join that matters: the directory the fetcher writes
is the directory the builder reads is the directory the accuracy test reads.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "scripts" / "data"
DATA_DIR = REPO_ROOT / "data" / "linz"


def load_script(name: str) -> ModuleType:
    """Loads one of the data scripts without running its main()."""
    path = SCRIPTS / name
    assert path.exists(), f"{path} is missing"
    spec = importlib.util.spec_from_file_location(path.stem.replace("-", "_"), path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_fetcher_writes_the_repo_data_dir() -> None:
    fetcher = load_script("fetch-linz.py")
    assert fetcher.REPO == REPO_ROOT
    assert fetcher.OUTPUT_DIR == DATA_DIR


def test_the_builder_reads_the_repo_data_dir() -> None:
    builder = load_script("build-linz-index.py")
    assert builder.DATA_DIR == DATA_DIR


def test_the_layer_lister_reads_the_repo_root_for_its_key() -> None:
    lister = load_script("list-linz-layers.py")
    assert lister.REPO == REPO_ROOT


def test_the_pipeline_and_the_accuracy_test_agree_on_the_data_dir() -> None:
    """The join that broke: the builder's output is the suite's input."""
    fetcher = load_script("fetch-linz.py")
    builder = load_script("build-linz-index.py")

    accuracy_path = REPO_ROOT / "services" / "api" / "tests" / "test_linz_accuracy.py"
    spec = importlib.util.spec_from_file_location("linz_accuracy_under_test", accuracy_path)
    assert spec is not None and spec.loader is not None
    accuracy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(accuracy)

    assert fetcher.OUTPUT_DIR == builder.DATA_DIR == accuracy.DATA_DIR


def test_the_data_dir_is_the_one_gitignore_covers() -> None:
    """The pipeline's output must never be committable, in any location."""
    fetcher = load_script("fetch-linz.py")
    ignored = {
        line.strip()
        for line in (REPO_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    }
    assert fetcher.OUTPUT_DIR.relative_to(REPO_ROOT).as_posix() + "/" in ignored


def test_the_areas_are_the_three_territorial_authorities() -> None:
    """C3's three areas, pinned so a rename cannot silently drop one."""
    fetcher = load_script("fetch-linz.py")
    assert sorted(fetcher.AREAS) == ["christchurch", "selwyn", "waimakariri"]
    for area, (min_lat, min_lon, max_lat, max_lon) in fetcher.AREAS.items():
        assert -48 < min_lat < max_lat < -33, f"{area}: the latitudes are not New Zealand"
        assert 165 < min_lon < max_lon < 180, f"{area}: the longitudes are not New Zealand"


@pytest.mark.parametrize(
    "name",
    ["fetch-linz.py", "build-linz-index.py", "list-linz-layers.py", "fetch-linz-changeset.py"],
)
def test_no_script_prints_the_key(name: str) -> None:
    """The key is read from .env.local and never reaches stdout (AGENTS.md).

    Parsed, not grepped: a docstring line that says "the key is never printed" is
    not a print call, and a grep over the word "key" fails on the very sentence
    that states the rule.
    """
    import ast

    tree = ast.parse((SCRIPTS / name).read_text(encoding="utf-8"))
    calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "print"
    ]
    assert calls, f"{name} reports its progress, so it must have a print call to inspect"
    for call in calls:
        rendered = ast.dump(call)
        assert "api_key" not in rendered, f"{name}: a print call carries api_key()"
        assert "LINZ_LDS_API_KEY" not in rendered, f"{name}: a print call reads the key"


# ---------------------------------------------------------------------------
# The weekly changeset import (C3)
# ---------------------------------------------------------------------------


def test_the_changeset_layer_id_is_the_address_layer_with_the_suffix() -> None:
    """LINZ's rule: the layer id carries `-changeset` (their URL syntax page)."""
    changeset = load_script("fetch-linz-changeset.py")
    fetcher = load_script("fetch-linz.py")

    assert changeset.CHANGESET_LAYER == fetcher.LAYER_ADDRESSES + "-changeset"


def test_the_changeset_request_carries_the_window_in_viewparams() -> None:
    """A changeset is the difference between two revisions, so both are named."""
    changeset = load_script("fetch-linz-changeset.py")

    url = changeset.changeset_url("KEY", (1.0, 2.0, 3.0, 4.0), "2026-10-23", "2026-10-30", 5, 0)

    assert "layer-123113-changeset" in url
    assert "viewparams=from:2026-10-23;to:2026-10-30" in url
    assert "bbox=1.0,2.0,3.0,4.0" in url
    assert "count=5" in url
    # The key is in the URL, which is how the service authenticates; it is never
    # printed (the test above parses every print call for it).
    assert "KEY" in url


def test_the_changeset_counts_every_action_and_refuses_an_unknown_one() -> None:
    """INSERT, UPDATE and DELETE are the actions LINZ publishes; nothing else
    may be counted as a change, or the week's evidence lies."""
    changeset = load_script("fetch-linz-changeset.py")

    rows = changeset.changed_rows(
        [
            {"properties": {"__change__": "INSERT", "address_id": 1, "full_road_name": "A St"}},
            {"properties": {"__change__": "UPDATE", "address_id": 2, "full_road_name": "B St"}},
            {"properties": {"__change__": "DELETE", "address_id": 3, "full_road_name": "C St"}},
            {"properties": {"__change__": "MAYBE", "address_id": 4, "full_road_name": "D St"}},
            {"properties": {"address_id": 5, "full_road_name": "E St"}},
        ]
    )

    assert [row["action"] for row in rows] == ["INSERT", "UPDATE", "DELETE"]
    assert rows[0]["id"] == "1"
    assert rows[0]["road"] == "A St"


def test_the_changeset_rows_carry_what_the_index_builder_needs() -> None:
    """The same fields `build-linz-index.py` writes, so a change can be applied
    to the index without a second mapping."""
    changeset = load_script("fetch-linz-changeset.py")
    builder = load_script("build-linz-index.py")

    row = changeset.changed_rows(
        [
            {
                "properties": {
                    "__change__": "INSERT",
                    "address_id": 1234,
                    "address_number": 12,
                    "address_number_suffix": "B",
                    "unit": "3",
                    "full_road_name": "Foo Street",
                    "suburb_locality": "Bar",
                    "town_city": "Christchurch",
                }
            }
        ]
    )[0]

    assert builder.DATA_DIR == changeset.OUTPUT_DIR
    assert set(row) == {"action", "id", "number", "suffix", "unit", "road", "suburb", "town"}
    assert row["id"] == "1234"
    assert row["suburb"] == "Bar"
