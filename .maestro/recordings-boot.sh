#!/usr/bin/env bash
# The boot body of the screen-recordings job's emulator step.
#
# WHY THIS FILE EXISTS (BUG-114): `reactivecircus/android-emulator-runner`
# does NOT run a multi-line `script:` as one shell program. Its
# `src/script-parser.ts` splits the input on newlines, drops the comments and
# the blank lines, and then `src/main.ts` runs EVERY remaining line as its own
# `sh -c "<that line>"`. So a multi-line body loses all shell state: a
# variable set on one line is empty on the next, an `export` dies with the
# subshell that made it, and — the line that took the job down — a standalone
# `set -euo pipefail` is executed by `sh`, which on the Ubuntu runner is dash,
# and dash has no `pipefail` option:
#
#   [command]/usr/bin/sh -c set -euo pipefail
#   /usr/bin/sh: 1: set: Illegal option -o pipefail
#
# (run 40962263045, PR #49, "Record the screens on the emulator", red on the
# very first line of the script after a 40-second boot). `android-e2e.yml`
# already did this right — its `script:` is the single line
# `bash .maestro/run-all.sh` — and this job now does the same. The fix is not
# to drop `set -euo pipefail` (it is the right discipline for a boot body with
# `curl`, `sha256sum` and `rm -rf` in it); it is to run the body under bash,
# where the option exists.
#
# Keeping the body in one bash program also fixes the two silent bugs the
# line-by-line execution was hiding: `url="..."` followed by a `curl ..."$url"`
# on the next line (an empty URL under sh-per-line) and `export PATH=...`
# followed by a bare command name (a PATH that never survived).

set -euo pipefail

PKG=com.courier.copilot

# The Maestro CLI: the pinned release, downloaded directly and its archive's
# checksum verified before any byte runs - exactly the way android-e2e.yml
# installs it (BUG-065). The installer would be the other path, and it
# prefixes `cli-` onto MAESTRO_VERSION, which turns this pin into a 404 and
# leaves no CLI on the box (run 40319441601: `maestro: not found`, exit 127).
# One install, one pin semantic, in both workflows.
url="https://github.com/mobile-dev-inc/Maestro/releases/download/${MAESTRO_VERSION}/maestro.zip"
curl -fsSL --retry 3 -o "$RUNNER_TEMP/maestro.zip" "$url"
echo "${MAESTRO_SHA256}  $RUNNER_TEMP/maestro.zip" | sha256sum -c -
rm -rf "$HOME/.maestro" "$HOME/.maestro/tmp"
mkdir -p "$HOME/.maestro/tmp"
unzip -qo "$RUNNER_TEMP/maestro.zip" -d "$HOME/.maestro/tmp"
cp -rf "$HOME/.maestro/tmp/maestro/." "$HOME/.maestro/"
rm -rf "$HOME/.maestro/tmp" "$RUNNER_TEMP/maestro.zip"

# The PATH export survives here, because this is one bash program.
export PATH="$HOME/.maestro/bin:$PATH"
maestro --version

# The app and its permissions: granted up front so the system dialog never
# sits on the screen the recording has to show.
adb wait-for-device
adb install -r apk/app-release.apk
adb shell pm grant "$PKG" android.permission.RECORD_AUDIO || true
adb shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION || true
adb shell pm grant "$PKG" android.permission.ACCESS_COARSE_LOCATION || true
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true

# The composition needs ffmpeg for the side-by-side (not on the runner image
# by default - run 39909043491 recorded the raw mp4s and then failed at the
# compose).
sudo apt-get update -qq
sudo apt-get install -y -qq ffmpeg

# The recordings: one flow per screen file, light pass then dark.
bash .maestro/recordings-run.sh
