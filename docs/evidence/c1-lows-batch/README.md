# C1's low findings, one batch — the evidence (branch fix/c1-lows-batch)

Eight rows, each fixed at its root with a red-first test (PLAYBOOK §14), the
suite's numbers taken from the runs on this branch. The mobile suite is
584 tests / 64 suites (one 5-second-timeout failure on the first full run was a
load flake on the developer machine — the same suite passed 584/584 alone and
on the second full run, and the failing test, `registrationSignsIn`, does not
touch any file this batch changes).

## BUG-082 — one unmounting subscriber detached every earbud listener

`apps/mobile/src/voice/EarbudButtonModule.ts`: `removeListeners(count)` called
`removeAllListeners()`. The wrappers the module creates for NativeEventEmitter
are now remembered per event, and `removeListeners(count)` removes exactly that
many — the newest first, each by the name it was added under.

New suite `apps/mobile/src/voice/__tests__/EarbudButtonModule.test.ts` (react-native
mocked with a recording emitter; the engines mocked virtually, the way the
lifecycle suite writes them, so the import chain stops at VoiceService). RED
first, against the pre-fix file swapped in place:

```
BUG-082 RED first against the pre-fix code:
Tests:       4 failed, 1 passed, 5 total
```

GREEN after: the five cases pass (two subscribers, the newest removed first, a
listener the module never added is left alone, a count larger than it holds is
tolerated).

## BUG-083 — a long press during speech flipped the machine to `listening`

`apps/mobile/src/voice/VoiceService.ts`: `startListening()` refuses while the
state is `speaking`. Barge-in (stop the answer, then listen) is its own feature
and is not what this guard pretends to be: while speaking, the press is refused
and the answer finishes.

New suite `apps/mobile/src/voice/__tests__/voiceServiceSpeaking.test.ts` (the
TTS engine's answer is held open so the machine can be observed mid-speech).
RED first:

```
BUG-083 RED first against the pre-fix code:
    Expected: "speaking"
    Received: "listening"
```

GREEN after: two cases pass — the press during speech leaves the machine
speaking and it returns to idle when the answer ends; the press while idle
still listens.

## BUG-084 — a corrupt stored `language` survived the restore

`apps/mobile/src/voice/settings.ts`: the language is validated against the
service's own vocabulary (`VOICE_LANGUAGES` = `en-NZ`, `mi-NZ`, `auto`, the
set `VoiceConfig.language` names) instead of only being checked for a non-empty
string. RED first, in `voiceSettings.test.ts`:

```
BUG-084 RED first against the pre-fix code:
Tests:       1 failed, 9 passed, 10 total
```

(the failing case is `fall back on a language the service does not speak`:
`parseVoiceSettings({ language: 'klingon' })` answered `klingon` before the fix
and the default after.)

## BUG-093 — the sync loop re-offered a silent batch without limit

`apps/mobile/src/sync/syncService.ts`: the run offers a batch the server took
nothing from at most three times, with the service's own backoff
(`retryBackoffMs`) between the offers, and then hands the cadence back to the
caller — which the audit's probe measured as the caller's already. The
in-loop pause is driven by timers the test advances. RED first:

```
BUG-093 RED first against the pre-fix code:
    Expected: 3
    Received: 4
```

(the unbounded loop kept offering: the transport's guard rejected past the
third offer and the run answered a failed outcome with four calls.)

## BUG-105 — CodeQL analysed untrusted code after it had run

`.github/workflows/codeql.yml`: the `pull_request` trigger is filtered to the
one protected branch (`main`), and `pnpm install --frozen-lockfile` now runs
AFTER `github/codeql-action/init`, so a pull request's lifecycle scripts cannot
execute before the extractor exists to watch them. The workflow's own run on
this PR's head is the proof (the CodeQL checks green on the final head).

## BUG-106 — the restore drill never restored PostGIS

`infra/test-restore.sh` now creates `CREATE EXTENSION postgis` and a geometry
row in its scratch source, and asserts the extension and the point survive the
real backup/restore round trip; `.github/workflows/restore-test.yml` serves the
drill with production's own image (`postgis/postgis:16-3.6`, the pin in
`infra/postgres/Dockerfile`). RED first, run for real against Docker:

```
# the old service image (postgres:16-alpine):
ERROR:  extension "postgis" is not available
DETAIL:  Could not open extension control file .../extension/postgis.control
[restore-test] error: cannot fill the source database
```

GREEN on production's image, the drill's own log:

```
[restore-test] the source holds 5 stops, 3 events, 0 rows in the empty table and 1 geofence
[restore-test] the postgis extension and its geometry are back
[restore-test] the data is back, not only the number of rows
[restore-test] the restore test passed
```

## BUG-107 — the environment gate was wired to nothing

`scripts/ci/check-secrets.js` reads `.env.local` from the repository root
(two levels up from the script) instead of the caller's cwd, and the
`quality-gates` job runs it (with the required variables provided as CI values,
since a checkout carries no `.env.local`). RED first, against the pre-fix
script swapped in place:

```
BUG-107 RED first against the pre-fix code:
✖ the gate reads the repository root's .env.local, not the caller's cwd (BUG-107)
    MISSING DATABASE_URL
```

(called from `apps/mobile` with a clean environment: the cwd-based path found
no file and the required variables came back missing). GREEN after: the gate
clears from any directory, and its output still carries names only — the new
case `the gate prints names, never a secret value` asserts no value from
`.env.local` appears in what it prints.

## BUG-108 — the workflow gate read one indentation style

`scripts/ci/check-workflows.mjs` parses the STRUCTURE now (`structureOf`): the
mapping paths are derived from the nesting — any indent width, a sequence at
its parent key's own column, a block scalar's content skipped — so a workflow
written in another valid YAML style cannot hide a defect. A line the structure
cannot place (a tab in the indentation, a bare scalar where a key belongs, an
unquoted anchor or alias) is a violation rather than a skip.

RED first, the two new cases against the pre-fix parser:

```
✖ a wider indent carries the same job-level secret (BUG-108)
✖ a sequence at its parent key's column is read too (BUG-108)
ℹ tests 17   ℹ pass 13   ℹ fail 4
```

(the four failures include the two new cases and the two repo-tree cases, which
fail only in the probe copy that has no `.github/workflows`). GREEN after: all
17 cases of `check-workflows.test.mjs` pass — the 15 that existed before this
batch, including the BUG-067 root cause, the BUG-100 job-level secret and the
repo's own 13 workflows, plus the two style cases above.

## The gates on this branch

- mobile: `jest` 584 tests / 64 suites, GREEN (see the flake note above);
- `node --test scripts/*/__tests__/*.test.mjs` — 144 tests, 142 pass, 0 fail,
  2 skipped (the two Windows-skipped licence-shim cases from PR #161's suite);
- `check-workflows.mjs` (13 workflows), `check-e2e-pins.mjs`,
  `check-emulator-gpu.mjs`, `check-floor.mjs origin/main`,
  `check-conflict-markers.mjs`, `check-mojibake.mjs`, `check-control-chars.mjs`
  — clean.
