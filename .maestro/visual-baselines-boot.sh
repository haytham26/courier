#!/usr/bin/env bash
# The boot body of the P4 visual-baselines job's emulator step (BUG-114's lesson:
# the runner splits a multi-line `script:` per line and runs each under dash, so
# the body is one bash program — the same shape as .maestro/recordings-boot.sh).
#
# It installs the PINNED Maestro (checksum verified), the E2E-flavoured release
# APK and the permissions the flows need, then runs .maestro/visual-baselines-run.sh.

set -euo pipefail

PKG=com.courier.copilot

url="https://github.com/mobile-dev-inc/Maestro/releases/download/${MAESTRO_VERSION}/maestro.zip"
curl -fsSL --retry 3 -o "$RUNNER_TEMP/maestro.zip" "$url"
echo "${MAESTRO_SHA256}  $RUNNER_TEMP/maestro.zip" | sha256sum -c -
rm -rf "$HOME/.maestro" "$HOME/.maestro/tmp"
mkdir -p "$HOME/.maestro/tmp"
unzip -qo "$RUNNER_TEMP/maestro.zip" -d "$HOME/.maestro/tmp"
cp -rf "$HOME/.maestro/tmp/maestro/." "$HOME/.maestro/"
rm -rf "$HOME/.maestro/tmp" "$RUNNER_TEMP/maestro.zip"
export PATH="$HOME/.maestro/bin:$PATH"
maestro --version

adb wait-for-device
adb install -r apk/app-release.apk
adb shell pm grant "$PKG" android.permission.RECORD_AUDIO || true
adb shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION || true
adb shell pm grant "$PKG" android.permission.ACCESS_COARSE_LOCATION || true
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true

bash .maestro/visual-baselines-run.sh
