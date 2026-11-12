# Scale evidence — the seeded full shifts, the kills, and the device legs

**Week:** 2026-W46 · **Lane:** the scale-tests sub-agent of the lead session ·
**Branch:** `scale/tests` · **Worktree:** `.worktrees/scale-tests` ·
**Everything below was MEASURED, on this machine, with the commands as
written.** Where a leg did not run, it says so and names the reason; a number
that was not measured is never reported as a pass.

The directive (2026-11-10, item 5):

1. **≥ 100 seeded simulated full shifts** — load → navigate → deliver → fail
   with a reason → POD photo → break → finish — deterministic, driven through
   the app's own store/service path, with 0 crash, 0 ANR, 0 data loss.
2. **Kill the app mid-delivery and mid-sync** and prove exactly-once sync with
   0 data loss (the delivery event, the POD, the note all land exactly once).
3. **adb monkey/stress on every screen** of the E2E build on the CI AVDs, both
   api legs, 0 crashes/ANRs required.
4. **Permissions, low battery, offline** — denied and revoked permissions
   mid-shift; low-battery mode; the results recorded.

## 1. The seeded full shifts — 120 of them, 2864 stops, on the app's own path

### The set

|           |                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| generator | `scripts/eval/build-scale-shifts.mjs` (mulberry32, **seed 20261111**)                                                      |
| the set   | `packages/eval/scale/shifts.jsonl` — one JSON object per shift                                                             |
| manifest  | `packages/eval/scale/manifest.json` (the seed, the counts, the pool's sha256)                                              |
| addresses | the **committed routing pool** (`packages/eval/routing/manifest/pool.json`, 560 real LINZ Canterbury addresses, CC BY 4.0) |
| licence   | LINZ Data Service layer 123113, CC BY 4.0, through the routing pool; the reasons/notes/words are this repository's own     |
| gates     | `node --test scripts/eval/__tests__/build-scale-shifts.test.mjs` — **8 tests, 8 pass**                                     |

| the counts                                       |                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| shifts                                           | **120** (the directive's floor is 100)                                                  |
| stops                                            | 2864 (8–40 per shift, one area per shift: 40 Christchurch / 40 Selwyn / 40 Waimakariri) |
| delivered                                        | 1764                                                                                    |
| failed (with a reason + the courier's own words) | 562                                                                                     |
| skipped                                          | 289                                                                                     |
| left pending (the courier never reached them)    | 249                                                                                     |
| proof photos                                     | 1019                                                                                    |
| notes                                            | 423                                                                                     |
| spoken commands                                  | 360 (120 start_break, 120 end_break, 120 end_shift)                                     |
| the set's sha256                                 | `386E68F9DC979AEBA1490755CF0F9A319C5ABCEBFCFDBE4644E7688F0AECB555`                      |

**The set is deterministic**: two runs of the generator build byte-identical
bytes, and the committed file is that build (the suite asserts it).

### The run

```bash
cd apps/mobile
node_modules/.bin/jest.cmd src/run/__tests__/scaleShifts.test.ts
```

`apps/mobile/src/run/__tests__/scaleShifts.test.ts` drives **all 120 shifts**
through the app's own code: the store's own network path (`RunStore` over the
API seam answering the committed shift) into the phone's own
`OpSqliteRunCache`; `applyRouteOrder` for the solver's order; the app's own
pod seam (`captureForThisBuild` / `uploaderForThisBuild`, the E2E build's own
canned JPEG with its real `FFD8FF` magic); the app's own parser and router for
the skip, the note, the break and the finish; and the app's own
`SyncService` + `apiSyncTransport` + `CourierApiClient` for the sync, over a
loopback stack that answers the contract's own shape.

**The whole run took 6.9 s** (the per-shift times are in `results/per_shift.csv`)
and left:

|                                             |                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| shifts driven                               | 120 (0 stopped early)                                                                      |
| marks on the run                            | **2326** = the stops that moved (1764 delivered + 562 failed)                              |
| events in the log                           | 2326 — one per marked stop, no duplicates, none lost                                       |
| events the outbox sent                      | 2326                                                                                       |
| events the server stored                    | 2326 — exactly once each                                                                   |
| replays the run made                        | **0**                                                                                      |
| events still owed after the shift           | **0**                                                                                      |
| unhandled rejections (a crash on the phone) | **0**                                                                                      |
| warnings the app itself wrote               | 120, and every one of them the harness's own asking (the solver's refusal of a half order) |
| problems the run found                      | **0**                                                                                      |

The evidence the run writes: `results/per_shift.csv` (one row per shift) and
`results/shift-summary.json`.

### The red runs, and what each one was

The harness was red five ways before it was green, and each red is fixed or
named in the test file's own comments:

- **the marks never read back** — the harness's own stand-in SQL bound a
  WHERE parameter per row instead of per statement (a stand-in defect, fixed);
- **the skips the parser could not hear** — the app's own
  `SPOKEN_SKIP_PATTERNS` is anchored on a spoken address (`skip this one at 14
Sandy Beach Road`), and a LINZ suburb with a macron or a slash in it is
  spoken as the street alone. The harness now builds the sentence the app's own
  parser accepts, and the trace records which form each address needed
  (283 of the 289 skips carried their suburb);
- **the break words the ear does not say** — the app's own `SPOKEN_MINUTES`
  carries `fortyfive`, not `forty five`; the generator was emitting the
  unparseable one and the harness caught it;
- **the finish the app does not hear** — the app's own `end_shift` pattern is
  `end (my) shift`, not "finishing the run";
- **the failed events with no reason** — that one is the app's own defect, and
  it is **BUG-306** (below).

## 2. BUG-306 — the phone's event log drops the reason a failed delivery carries

**The number, and the collision.** This lane's commits were written saying
BUG-305; **BUG-305 was already taken** — the lead's import-sheet fix (PR #306,
merged to origin/main while this lane was working). The register number for the
defect below is **BUG-306**, the next free number in the lead's 305..349 range,
and the rename is recorded here exactly the way BUG-304's was: the commit
messages say 305, the register says 306. The row itself is the lead's to file.

**The claim, red-first** (`apps/mobile/src/sync/__tests__/eventLogReason.test.ts`,
3 tests): _a failed delivery the courier records keeps the reason the server
refuses to be without, through the phone's own store and out to the API's own
vocabulary._

**The red run** (against origin/main's code, before the fix):

```
Expected: "no one home"   Received: undefined
Expected: "refused"       Received: undefined
Expected: "damaged"       Received: undefined
Tests:       3 failed, 3 total
```

**Why it matters, and it is not cosmetic.** The API's `DeliveryEvent` carries
a `@model_validator` that raises on a `failed` event with no reason
(`services/api/app/main.py:356`), and a pydantic failure in a list body is a
**422 for the whole batch**. A batch the server refuses is one the outbox
**quarantines** (ADR-014 §3) and never re-offers. So the reason the store
dropped on the write was a failed delivery the office would never hear about
at all — 562 of them in the 120-shift run, each reaching the server with no
reason.

**The fix** (one product file, `apps/mobile/src/sync/opSqliteEventStore.ts`):
the `reason` column rides the event log's table (shape version 1 → **2**, so
`migrateTable` adds it to an installed phone — BUG-087's own path), the write
carries it, the pending read selects it, and `eventOf` reads it back. The
green run is 3/3, and the 120-shift harness now proves the reason survives to
the wire (every failed row on the server carries it).

**One existing assertion amended honestly**: `opSqliteEventStore.test.ts`
pinned the shape's version to 1; the shape grew, so the version is 2 now. The
claim ("the shape's version is the one the code writes") is unchanged.

## 3. The kill legs — mid-delivery, mid-sync, and a partial accept

```bash
cd apps/mobile
node_modules/.bin/jest.cmd src/run/__tests__/scaleKillSync.test.ts
```

`apps/mobile/src/run/__tests__/scaleKillSync.test.ts` — **4 tests, 4 pass**
(the whole file: ~11 s):

| the leg                 | what it measured                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a kill mid-delivery** | 20 seeded shifts, each killed **twice** (at a seeded stop and at the day's end) and cold-started to finish its day — **40 kills**. Every mark, every event and every reason survived, and the server holds exactly one row per event id: **0 lost, 0 duplicated**                                                                                                   |
| **a kill mid-sync**     | the server **stores the batch and dies before it answers**; the phone reads that as "nobody answered" and keeps the events; a cold start re-sends the very same event ids, and the server's own `ON CONFLICT (id) DO NOTHING` keeps one row each. The outbox also asked again for what was never confirmed — its own retry bound (BUG-093), never a second delivery |
| **a partial accept**    | the server takes half the batch: the phone confirms exactly that half (BUG-076) and the rest send on the next ask, each landing once                                                                                                                                                                                                                                |
| **the set**             | the kill legs drive the committed set, unchanged                                                                                                                                                                                                                                                                                                                    |

What the kill legs do **not** claim: the Android process itself. The phone's
storage here is the app's own `OpSqliteRunCache` and `OpSqliteEventStore` over
a stand-in that keeps its rows across a `closeAsync()` — which is what a file
on a phone does when the process that held it dies. The SQLCipher file's own
behaviour under an OS kill is the device's leg.

## 4. The real stack — the same claims against the real API and the real Postgres

```bash
docker compose -f infra/compose.ci.yml up -d --wait
cd apps/mobile
node_modules/.bin/jest.cmd src/run/__tests__/scaleStackSync.test.ts
```

`apps/mobile/src/run/__tests__/scaleStackSync.test.ts` — **2 tests, 2 pass**
(~10 s). This is the leg that turns "the harness says so" into "the database
says so": the day is seeded on the real API through the app's own
`CourierApiClient`, the marks go through the app's own `RunStore` →
`EventLog` → `SyncService` → `apiSyncTransport` against
`http://127.0.0.1:8000`, and the rows are read out of the real Postgres with
`docker compose exec -T postgres psql`.

The kill is the one a courier's phone actually dies of: the server has taken
the batch and the phone is gone before it can confirm. The cold start re-sends
the same event ids.

| the measured answer                                               |                                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| events this run wrote, by their ids                               | 4                                                                                                   |
| rows in `delivery_events` for those ids                           | **4** — one per id, no duplicates                                                                   |
| the failed event's `reason` in the database                       | **`no one home`**                                                                                   |
| delivered events                                                  | 3                                                                                                   |
| the stops the API answers with, read through the app's own client | `delivered`, `delivered`, `failed`, `delivered` (the statuses are derived from the log, ADR-010 §2) |
| the POD uploaded for the event the server already has             | 200 + `already_stored: true`, and **one** row for that id after two uploads                         |
| the POD's first-store branch (an id the server has never seen)    | **201** + `already_stored: false`, then the replay 200 + `already_stored: true`, still **one** row  |
| the phone's pending count after the cold start's sync             | **0**                                                                                               |

**The leg’s repeatability, measured rather than assumed.** The green run above
is real and repeatable, but two of this machine’s own limits bound how often it
can be re-run in a row, and both are named so nobody reads a later red as a
regression:

- the auth service’s **per-account sign-in limit** (`/sign-in/email`: 5 per 900 s,
  `services/auth/src/http.ts`) — the lane’s own throwaway account is spent after
  five runs, and the next sign-in is refused until the window passes. A fresh
  account (or a CI runner’s own) is what a repeatable job needs;
- **the docker engine on this PC is shared** with the lead session’s own stacks
  (`courier-local-*`), and it went down twice while this lane worked — each time
  the A1 stack came back up with `docker compose -f infra/compose.ci.yml up -d
--wait`. A red on this suite with `ECONNREFUSED` or `socket hang up` is that,
  and the suite says so loudly rather than passing vacuously.
  **Why this suite is not in the default app suite.** It needs the A1 compose
  stack, so it runs as its own command and belongs to a CI job of its own. It
  **fails loudly** when the stack is not up (a test that passes because no
  server answered proves nothing), and it is named in `apps/mobile/jest.config.js`
  with that reason rather than removed. **The lead's call:** the job that runs it
  (`android-e2e.yml`'s A1 stack is already there in CI) is a workflow change,
  which is the lead's to add.

**The stack's own limits, measured on this machine:** the auth service limits
sign-ups per IP and sign-ins per account (`/sign-in/email`: 5 per 900 s,
`services/auth/src/http.ts`), so the lane's own throwaway account is reusable
and the test signs in to it after its first run. Restarting the auth container
clears the in-memory counters.

## 5. The device legs — the monkey, the permissions, the battery, the offline

**These legs did NOT run, and the reason is a fact about the machine, not a
choice.** The device that was connected (the founder's BlueStacks 5, Android
13 / API 33, x86_64, `127.0.0.1:5555`, our E2E-flavoured APK installed
alongside since 2026-11-09 14:14) **disappeared while this lane was working**:
no BlueStacks/HD-Player process is running, and every documented adb port
(5555, 5556, 5565) refuses the connection. `adb devices` lists nothing.
Before it disappeared, the app was confirmed running (the E2E build: the
`today-screen` with the mock Northwood AM day) and the adb shell was healthy.

What this means, plainly:

- **The CI AVDs are the gate for every device leg** (`.github/workflows/android-e2e.yml`,
  api 34/35 × small/large), and a new job that runs the monkey legs is a
  workflow change — **the lead's to add**. This lane did not add one.
- **BlueStacks could not have carried the Maestro legs anyway** (BUG-303: its
  adb bridge closes the persistent `shell,v2` stream Maestro's dadb holds
  open, and `adb root` kills the bridge). One-shot `adb shell` commands work,
  which is why the driver below is the hand-rolled idiom BUG-303 recorded.
- The monkey leg on the **founder's BlueStacks is therefore not available in
  this lane**, and no number from it is quoted here.

**What was delivered instead:** the ready-to-run driver,
`scripts/eval/scale-device-legs.sh`, which walks every screen of the E2E build
by testID (the same contract the Maestro flows use) and runs, per screen, a
seeded monkey burst with the crashes and ANRs read from the crash buffer and
the processes dump; then the three condition legs — the permissions revoked
mid-shift and re-granted with the screen dump kept as the evidence, the
low-battery mode with a burst under it, and the offline run with the delivery
marked with no signal and the app's own answer captured. A screen that never
answers its testID fails the leg loudly instead of being skipped.

```bash
# with any device connected (the CI AVD runner, or the founder's device once
# BlueStacks is back):
adb devices -l
bash scripts/eval/scale-device-legs.sh -s emulator-5554 --events 3000 --seed 20261111
```

The numbers to quote once it runs are written to
`docs/evidence/scale-tests/device/`: `device.txt` (the model, the api level,
the abi, the version), `monkey.txt` (the seed, the event count, the
crashes/ANRs per screen), `permissions.txt`, `battery.txt`, `offline.txt`, and
the a11y dumps and screenshots that go with them.

## 6. The commands, end to end

```bash
# the set and its gates
node scripts/eval/build-scale-shifts.mjs
node --test scripts/eval/__tests__/build-scale-shifts.test.mjs

# the 120 shifts on the app's own path (the evidence the README quotes)
cd apps/mobile && node_modules/.bin/jest.cmd src/run/__tests__/scaleShifts.test.ts

# the kill legs
cd apps/mobile && node_modules/.bin/jest.cmd src/run/__tests__/scaleKillSync.test.ts

# the reason (BUG-306), red-first
cd apps/mobile && node_modules/.bin/jest.cmd src/sync/__tests__/eventLogReason.test.ts

# the real stack
docker compose -f infra/compose.ci.yml up -d --wait
cd apps/mobile && node_modules/.bin/jest.cmd src/run/__tests__/scaleStackSync.test.ts

# the device legs (needs a device)
bash scripts/eval/scale-device-legs.sh -s <serial>

# the whole app suite, with the stack leg named out of it (108 suites, 902 tests)
cd apps/mobile && node_modules/.bin/jest.cmd
```

## 7. What is NOT measured here, and stays named

- **The Android UI, the emulator and the AVDs.** No emulator ran in this lane
  (the repo's own rule: the emulator runs on GitHub Actions). The CI AVDs are
  the gate; the monkey, permission, battery and offline legs are theirs, and
  the job that carries them is the lead's to add.
- **The founder's BlueStacks device.** It disappeared before these legs could
  run, and BUG-303 refuses Maestro on it in any case.
- **The native SQLite engine and the SQLCipher file under an OS kill.** The
  stores are the app's own, over a stand-in that behaves like the file does;
  the engine itself is the device's leg (the A1 job's real run proves it).
- **The on-device STT, the wake word, the address engine, the latency and the
  battery.** Those are EVAL.md M1/M2/M4/M5/M6/M7 and the voice lane's own.
- **The POD's multipart through the app's own client in jest.** React Native's
  FormData turns the client's `{uri,name,type}` triple into a part; the jest
  environment has no such platform. The stack leg speaks the same multipart
  with the runtime's FormData and the app's own canned bytes, and the device
  leg (`.maestro/pod.yaml`) is the app's own half.
- **No CI run was started by this lane.** The PR's checks are the lead's to
  read, and the monkey job is the lead's to add.
