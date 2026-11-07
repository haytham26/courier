"""Dump the SURVIVING mutants with their diffs, for triage (BUG-241).

`mutmut results` prints only `module.function__mutmut_N: status` - enough to
count, not enough to write a killing test. This script walks the mutatable
files exactly as `mutmut results` does (mutmut/utils/file_utils.py), loads each
file's stored mutation data, and prints every non-killed mutant as:

    # <path> <mutant-name>: <status>
    <the diff mutmut generated for it>

Run it inside the service's own environment, from the service directory, after
`mutmut run` (exactly where check-mutation-floor.mjs's `run` mode leaves the
`mutants/` tree and its index):

    uv run --extra dev --directory services/api python ../../scripts/ci/mutmut-survivors.py

The output is captured to `mutants/mutmut-survivors.txt` and uploaded beside
the stats, so the score-raising slices can name the surviving classes instead
of guessing. Importing mutmut's data modules is safe on Windows; only
`mutmut.__main__` blocks it (boxed/mutmut#397), and this script never imports
it.
"""

from __future__ import annotations

from mutmut.mutation.data import SourceFileMutationData
from mutmut.mutation.diff_apply import get_diff_for_mutant
from mutmut.stats import status_by_exit_code
from mutmut.utils.file_utils import walk_mutatable_files


def main() -> None:
    chunks: list[str] = []
    for path in walk_mutatable_files():
        data = SourceFileMutationData(path=path)
        data.load()
        for key, exit_code in data.exit_code_by_key.items():
            status = status_by_exit_code.get(exit_code, "?")
            if status == "killed":
                continue
            try:
                diff = get_diff_for_mutant(key, path=path)
            except Exception as exc:  # a missing index entry must not kill the dump
                diff = f"<diff unavailable: {exc}>"
            chunks.append(f"# {path} {key}: {status}\n{diff}")
    print("\n".join(chunks))


if __name__ == "__main__":
    main()
