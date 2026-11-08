# Feeding test audio into an Android emulator's microphone — 2026 research (founder directive 2026-11-08, item 1)

**Research date: 2026-11-08.** Method note: the session's websearch tool returned
**HTTP 402 on every query today**, so no search-engine snippet is quoted here.
Every source below was fetched directly on 2026-11-08 (developer.android.com,
vb-audio.com, raw.githubusercontent.com, api.github.com) and is quoted from that
fetch; the read date is on each row.

**The question:** how do we run voice E2E at scale — push-to-talk → STT → intent →
the action applied to the run → spoken confirmation → visible on screen → synced —
on the CI AVDs and on the founder's Magisk emulator, deterministically, with
real-mic parity for at least one sample per eval slice?

**The fact first:** there is no `adb` command that pushes a file into the
microphone. The official emulator command-line page
(https://developer.android.com/studio/run/emulator-commandline, read 2026-11-08)
lists `-audio-in` and `-audio-out` under **Deprecated options** — "depending on
the emulator version, they are ignored with a warning or rejected as unknown
options". The live audio controls on that page are `-noaudio` / `-no-audio` and
the `QEMU_AUDIO_DRV` environment variable (the QEMU audio backend). The
emulator's microphone is therefore fed by the **host's audio backend**: whatever
the host's capture device delivers becomes the guest mic when host audio is
allowed (`-allow-host-audio` per the directive; current default drivers bridge
host audio unless `-noaudio` is passed).

## Options compared

| # | Option | Reliability | Determinism | Licence | Windows | Founder's Magisk emulator | CI AVDs (ubuntu) | Real-mic parity |
|---|--------|-------------|-------------|---------|---------|--------------------------|------------------|-----------------|
| A | **Host loopback into the emulator's real audio backend**: VB-CABLE as the Windows default capture device on the founder's PC; PulseAudio null sink (`pactl load-module module-null-sink`) on CI runners; a 16 kHz mono WAV is played into the loopback at fixed gain while the AVD runs without `-noaudio` | Good — the audio HAL sees a genuine stream; needs host audio allowed and a stable virtual device | Medium — host mixer gain/resampling can colour the signal; mitigated by 16 kHz mono WAV, fixed device gain, AGC off on the virtual device | VB-CABLE is **donationware** (official page read 2026-11-08: "VB-CABLE is a Donationware! All participations are welcome") — dev-machine tool only, recorded in `docs/product/LICENSES.md`, never shipped; PulseAudio is LGPL — CI image only, never shipped | Yes | Yes — the audio path is unaffected by root/Magisk; ABI must match a sherpa-onnx prebuilt (x86_64 or arm64) | Yes — ubuntu runners carry PulseAudio/PipeWire; null sink + `paplay`/`pacat` | **Yes** — AudioRecord gets a real PCM stream |
| B | **Emulator `-audio-in <file>`** | Low across versions — officially deprecated (read 2026-11-08), ignored or rejected depending on the emulator build | High when it works | None (emulator binary, SDK licence) | Yes | Unknown — depends on the emulator build | Unknown — same | Yes (when accepted) |
| C | **DEBUG/TEST-flavour-only audio-file input in the app's own STT path**: the app already owns the seam — `transcribeRecordedUtterance(filePath, model)` in `apps/mobile/src/voice/streamingStt.ts` decodes a WAV to the recognizer's samples and recognises it with the latency measured; the live path is `aLiveListener` over `createPcmLiveStream`. A test flavour routes the "mic" to a WAV in the app's private dir, gated by a build flag so a release build can never reach it; `scripts/ci/check-mock-reach.mjs` (the A4 gate) must list the new seam next to `dayForThisBuild.ts` / `labelReader.ts` | High — our own code, no host audio in the loop | **Total** — byte-identical input, seeded runs, reproducible on any runner | None — our code | Yes | Yes | Yes | **No** — bypasses AudioRecord and the VAD input chain, so it complements A, never replaces it |
| D | **Server-side voice-agent harness** (pipecat-style orchestration driving STT → intent → action over the API, no mic at all) | Good for the action half of a turn | High | pipecat-ai/pipecat is **BSD-2-Clause** (LICENSE re-read 2026-11-08 from raw.githubusercontent.com — adoptable per D24); Andee-style on-device agents stay clean-room (reference-repos.md) | n/a (server) | n/a | n/a | No |

## Decision

**C is the deterministic scale path; A is the real-mic parity path (at least one
sample per slice); B is rejected (deprecated — kept only as a documented fallback
on a pinned old emulator); D is ideas/orchestration only (BSD-2-Clause adoptable,
no code taken yet).**

Concretely:

1. **Scale runs (≥500 scripted turns per run, quiet + van noise, including
   chatter that must NOT act)** use C: the test flavour feeds WAVs through
   `transcribeRecordedUtterance`, so every run is byte-deterministic and the
   mock-reach gate proves the input never exists in a release build. Every
   failure is a BUG in the lead's range **BUG-300..349** with a red-first fix.
   Evidence lands in `docs/evidence/voice-scale/`; the voice Maestro flows run
   in CI.
2. **Real-mic parity (≥1 sample per slice)** uses A: on the founder's PC,
   VB-CABLE as the Windows default recording device with the AVD started with
   host audio allowed; on CI, a PulseAudio null sink on the ubuntu runner.
3. **PC safety** (the directive's addendum): downloads only from the official
   site with the publisher signature/checksum verified — VB-CABLE's official
   page (https://vb-audio.com/Cable/index.htm, read 2026-11-08) ships
   `VBCABLE_Driver_Pack46.zip` (NOV 2026, XP→Win11 32/64-bit/Arm64) and says
   "Run Setup Program in administrator mode. **Reboot after installation**" —
   so the driver install is a **FOUNDER_TODO** until the founder allows the
   reboot/UAC; until then all runs use the file-input path C. Before changing
   the Windows default recording device, the current defaults are written in
   `docs/log/CURRENT.md` and restored after every test session; the founder's
   own apps and audio devices are never touched.
4. **The founder's emulator** is currently not visible to this session (adb
   server on PID 24544, `adb devices -l` = zero devices — recorded in
   `docs/log/CURRENT.md`). When it appears, the same two paths apply there;
   a rooted device fails Play Integrity — recorded, not our bug — and its
   results are SUPPLEMENTARY: the CI AVD legs stay the gate.

## Sources (all read 2026-11-08)

| Source | What it proved |
|--------|----------------|
| https://developer.android.com/studio/run/emulator-commandline | `-audio-in` / `-audio-out` are in the **Deprecated options** list; the live audio controls are `-noaudio` and `QEMU_AUDIO_DRV` |
| https://developer.android.com/studio/run/emulator | emulator basics; host-audio bridging is the default QEMU audio behaviour unless `-noaudio` |
| https://vb-audio.com/Cable/index.htm | VB-CABLE is donationware ("All participations are welcome"); package `VBCABLE_Driver_Pack46.zip` (NOV 2026, XP→Win11 32/64/Arm64); admin install + reboot |
| https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/LICENSE | sherpa-onnx code is **Apache-2.0** (default branch `master`, confirmed via the GitHub API) |
| https://raw.githubusercontent.com/snakers4/silero-vad/master/LICENSE | silero-vad's LICENSE **file** is **MIT** (the README badge still shows CC BY-NC 4.0 — the contradiction is recorded in `docs/product/LICENSES.md`) |
| https://raw.githubusercontent.com/xiph/rnnoise/master/COPYING | rnnoise is **BSD-3-Clause** (Xiph/Mozilla/Valin copyrights) |
| https://raw.githubusercontent.com/pipecat-ai/pipecat/main/LICENSE | pipecat is **BSD-2-Clause** (Copyright (c) 2024–2026, Daily) — adoptable per D24 |
