# Evidence — option C of the audio-injection research: a test-flavour audio-file input for the STT path

**Research:** `docs/research/2026/voice-audio-injection.md` (option C) ·
**Branch:** `voice/audio-file-input` · **Date:** 2026-11-08 ·
**PR:** "voice(app): test-flavour audio-file input for the STT path (release-unreachable, mock-reach-gated)" — PR number and CI run ids in §5.

## What landed

A new build-flag seam answers, for THIS build, whether an audio FILE may feed
the on-device recognizer and from where — mirroring `dayForThisBuild.ts` and
`labelReader.ts`:

- `apps/mobile/src/voice/audioSourceForThisBuild.ts` — the seam. A release
  build (`__DEV__` false, no E2E flag) answers `{ kind: 'never' }` whatever
  `EXPO_PUBLIC_E2E_AUDIO_FILE` says. A test build answers the file the flag
  names; the E2E build without the flag answers the runner-armed default
  `e2e-utterance.wav` in the app's document directory.
- `apps/mobile/src/voice/audioFileInput.ts` — the guarded source module (the
  flag's name, the default name, the path resolution). Imported ONLY by the
  seam: `scripts/ci/check-mock-reach.mjs` lists the seam in `SEAMS` and guards
  the `audioFileInput` name, so a screen importing the source directly is
  named as an offender.
- `apps/mobile/src/voice/VoiceService.ts` — `startListening` asks the seam
  first. When it answers a file, the push-to-talk feeds the file through the
  EXISTING `transcribeRecordedUtterance(file, model)` seam of
  `streamingStt.ts` (reused, not duplicated; the answer's `latencyMs` is the
  measured one) and the sentence drives the same turn flow a live ear drives
  (`holdTranscript` → the `onFinalTranscript` delegate). When no file is set,
  the live path (`aLiveListener` over `createPcmLiveStream`) is untouched.
- `scripts/ci/check-e2e-flag.mjs` — a release variant now also refuses a
  non-empty `EXPO_PUBLIC_E2E_AUDIO_FILE` (the `EXPO_PUBLIC_E2E=1` refusal
  message is byte-identical; with both flags set, both are named in the one
  refusal).
- `.maestro/voice-file-input.yaml` + `.maestro/fixtures/voice-file-input.wav`
  (16 kHz mono 16-bit PCM, 0.25 s, byte-stable) + `.maestro/run-all.sh`, which
  pushes the fixture into the app's document directory as
  `e2e-utterance.wav` after the first screen (best-effort with a warning — the
  push never takes the flows down).

## The release guarantee, three layers deep

1. **The seam:** release (`dev` false, `e2e` false) → `never`, pinned by
   `audioSourceForThisBuild.test.ts` ("a release build never answers an audio
   file, even with the flag inlined").
2. **The build gate:** `check-e2e-flag.mjs --variant release` exits 1 with
   `EXPO_PUBLIC_E2E_AUDIO_FILE=<value>` set, so the flag is never inlined into
   the artifact a courier runs.
3. **The reach gate:** `check-mock-reach.mjs` fails any non-seam file that
   imports `audioFileInput*`, so the file input is reachable only through the
   seam.

## Red first (PLAYBOOK §14)

Captured on the pre-change tree (worktree at `origin/main` = b389e56), before
the source files existed:

```
$ node --test scripts/ci/__tests__/check-e2e-flag.test.mjs
# 5 new tests red, e.g. "a release build with the audio-file flag fails":
# check-e2e-flag: no E2E flag and the build is release   (exit 0 — the flag was not refused)

$ node --test scripts/ci/__tests__/check-mock-reach.test.mjs
# 1 red: "a screen importing the audio-file source directly fails, and is named"
# AssertionError: Expected "actual" to be strictly unequal to: 0

$ node node_modules/jest/bin/jest.js src/voice/__tests__/audioSourceForThisBuild.test.ts src/voice/__tests__/voiceFileInput.test.ts src/voice/__tests__/fileInputDeterminism.test.ts
# 2 suites red: "Cannot find module '../audioSourceForThisBuild'"
```

## Green after the change (exact commands, run in the worktree root)

```
$ node --test scripts/ci/__tests__/check-e2e-flag.test.mjs scripts/ci/__tests__/check-mock-reach.test.mjs
# exit 0 — 12 e2e-flag tests + 7 mock-reach tests, all pass

$ node scripts/ci/check-mock-reach.mjs
# check-mock-reach: the mock list and the audio-file input are reachable only through the seams   (exit 0)

$ node scripts/ci/check-e2e-flag.mjs --variant release                       # exit 0: no E2E flag and the build is release
$ EXPO_PUBLIC_E2E_AUDIO_FILE=e2e-utterance.wav node scripts/ci/check-e2e-flag.mjs --variant release
# exit 1: BUG-079 (the audio-file input): this is a RELEASE build and EXPO_PUBLIC_E2E_AUDIO_FILE=e2e-utterance.wav, ...
$ EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_E2E_AUDIO_FILE=e2e-utterance.wav node scripts/ci/check-e2e-flag.mjs --variant release
# exit 1: both refusals printed, both named
$ EXPO_PUBLIC_E2E_AUDIO_FILE=e2e-utterance.wav node scripts/ci/check-e2e-flag.mjs --variant e2e
# exit 0: the audio-file flag names e2e-utterance.wav; no E2E flag and the build is e2e

$ cd apps/mobile && node node_modules/jest/bin/jest.js --ci
# Test Suites: 102 passed, 102 total — Tests: 868 passed, 868 total
# (includes the new audioSourceForThisBuild.test.ts, voiceFileInput.test.ts,
# fileInputDeterminism.test.ts — the release-never, the file→
# transcribeRecordedUtterance-with-latency, the unchanged-live-path and the
# same-WAV-bytes→same-transcript cases)

$ cd apps/mobile && node ../../node_modules/typescript/bin/tsc --noEmit    # exit 0
```

## The E2E flow's honest limit

The CI emulator has no STT model pack (founder-gated; `detectSttModel` on the
`models/stt.onnx` asset fails), so on the legs the file branch's answer is the
honest `no-model` error — a real STT turn on CI is not possible yet. The flow
`.maestro/voice-file-input.yaml` therefore drives the push-to-talk through the
file input (`today-add-by-voice`) and then completes the scripted turn through
the E2E canned queue exactly as `voice-turn.yaml` does (caption "Four stops
left on the run.", then the delivered screen). The file-input wiring itself —
which path `startListening` takes, with what, and the determinism — is pinned
by the unit tests above and the two gates.

## CI

PR CI (`.github/workflows/android-e2e.yml` legs run because `.maestro/**`
changed): run ids and conclusions recorded here after the run — see §5.

## §5 CI runs

- PR: #TBD (branch `voice/audio-file-input`, head TBD)
- android-e2e run: TBD — conclusion: TBD
- unit/lint/typecheck legs: TBD — conclusion: TBD
