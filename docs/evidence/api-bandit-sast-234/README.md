# BUG-234 evidence - bandit in the SAST job (audit item 4f, research A4)

## The gap
The `sast` job of `.github/workflows/quality-gates.yml` ran only `semgrep==1.182.1` with `p/default` + `p/owasp-top-ten`. Research section A4 (PyCQA/bandit: 8 326 stars, Apache-2.0, pushed 2026-10-19, read on PyPI 2026-11-07): ADOPT - Semgrep's Python rules are not a substitute for Bandit's Python-specific checks.

## Red first
- Plain `uvx bandit==1.9.4 -r services/api/app` exits 1 on the current tree - 3 LOW findings (all false positives, see below).
- A probe file with `subprocess.Popen(os.environ['CMD'], shell=True)`, `pickle.loads(...)`, `exec(...)`, `eval(...)` fails even under `-ll -ii` (rc=1: B602/B301/B102/B307) - the gate bites on the dangerous classes.

## Green after
- Workflow step added: `uvx bandit==1.9.4 -r services/api/app -ll -ii --quiet` (pinned like semgrep; medium+ severity AND medium+ confidence = build failure, matching the zero high/critical bar).
- `uvx bandit==1.9.4 -r services/api/app -ll -ii --quiet` on the real tree: exit 0. Accepted lows (documented in the workflow comment): B105 x2 on message strings (`auth/websocket.py` "the token is not valid", `nz_address.py` `== "and"`), B405 on `from xml.etree.ElementTree import ParseError` in `import_stops.py` - that import only catches openpyxl's parse errors; upload XML is never parsed with stdlib ET (magic check + zip-index cap before openpyxl, BUG-211).
- bandit 1.9.4 licence Apache-2.0 (PyPI license_expression, 2026-11-07); CI tool via uvx, so no uv.lock / LICENSES.md change (same as semgrep).
- `check-workflows.mjs` clean (15 workflows); node gates pass; parity 0 reopened vs origin/main.
