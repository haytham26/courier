# BUG-233 evidence - the tenant-isolation proof sweep (audit item 4e, research row 63)

## The gap
Isolation was enforced in the code (every repo lookup takes the owner as part of the predicate) and checked by scattered per-endpoint tests, but no single test proved driver A cannot read/write driver B across the whole surface - a new route could forget the owner predicate silently.

## Red first
The first run of `tests/test_tenant_isolation.py` failed 4 of 10 cases - all test-shape bugs, no production leak: the location-notes payload needs `kind`/`body` (not `note`), the pod-bytes route needs the grant's `expires`/`signature` query params (bare GET is a 422), and the bytes route is grant-authenticated by design (ADR-011 section 2: the URL's HMAC is the authority; the rows are still checked).

## Green after
- `tests/test_tenant_isolation.py` 10/10: foreign 404/empty on GET run, runs list, shift route, shift stops, pod bytes (bogus grant), pod presign-url; foreign 404 on POST pod upload, route:reopt, template, events:batch, import, intake manifest, intake - and the writes provably did not land (stops still `pending`, no template stored). Owner POD flow: presign -> bytes 200 with the exact bytes. Location notes: foreign GET/POST 404, owner's note intact. Entitlements per courier. Anonymous: 401 on every bearer route, 404 on the grant route.
- Neighbouring suites (`test_runs_api`, `test_location_notes`, `test_entitlements_api`) 99 passed; `ruff check .` and `mypy .` clean (81 files); full API suite green; parity 0 reopened vs origin/main.
