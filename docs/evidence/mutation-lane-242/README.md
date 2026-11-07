# BUG-242 evidence - the second wave of lane breakers (found by dispatching the repaired lane)

Run 42347923596 (workflow_dispatch on the BUG-241 head `367db7e`): both jobs still failed fast, but at NEW places — the stats pass had passed, so BUG-241's fixes held.

## (a) voice: the eval-manifest anchor
Voice job 128329604312, clean pass: `tests/test_turn_gate.py::TestTheRoutingIsMeasureAndCorrectOnTheSet` died with `FileNotFoundError: .../services/packages/eval/voice/manifest/scripts.jsonl`. The test anchored `REPO = Path(__file__).parents[3]`; under mutmut the file is `.../mutants/tests/test_turn_gate.py`, so parents[3] is `services/`, not the repo root.
Fix: strip the trailing `mutants` (`_service = _here.parents[1]; if _service.name == "mutants": ...; REPO = _service.parent.parent`), pinned by `test_the_manifest_anchor_never_resolves_into_the_mutants_copy`. `pytest tests/test_turn_gate.py`: 11/11.

## (b) API: the shared rate-limit bucket across in-process suite runs
API job 128329603937, clean pass: `test_the_webhook_route_has_its_own_limit` failed `assert 429 == 404` with `ratelimit 2 per 1 minute (ip:testclient) exceeded at endpoint: /billing/webhooks/stripe`. mutmut's harness runs `pytest.main` more than once in the same process (stats pass, then the clean pass), and slowapi's in-memory storage is module-global, so the webhook test's `ip:testclient` bucket (no Authorization header -> IP key, and TestClient's host is always `testclient`) was still full on the second pass.
Reproduced locally: `pytest tests/test_rate_limit.py` twice in one process -> pass 2 fails with the same 429 (red). Fix: the `limiter_on` fixture calls `app.state.limiter.reset()` before enabling, so each test starts from empty buckets; pinned by `test_reset_clears_the_shared_buckets`. Green post-fix: both in-process passes rc=0, the file 7/7, ruff clean.
