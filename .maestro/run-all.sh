#!/usr/bin/env bash
# The Android E2E runner: readiness gates with short timeouts, then the Maestro
# flows. Every gate dumps its evidence, and a failure stops the run immediately.
#
#   bash .maestro/run-all.sh
#
# The app runs in the E2E mode (EXPO_PUBLIC_E2E=1): local mocks, no Metro, no
# auth service and no API, so only the app itself is under test.
set -uo pipefail

cd "$(dirname "$0")/.."

APK="apk/app-release.apk"
EVIDENCE=".maestro/evidence"
PKG="com.courier.copilot"
BOOT_TIMEOUT=300   # 5 minutes
PID_TIMEOUT=60
SCREEN_TIMEOUT=90
FLOW_TIMEOUT=180  # 3 minutes per flow

mkdir -p "$EVIDENCE"

fail() {
  echo "::error::$1"
  dump_evidence
  exit 1
}

dump_evidence() {
  echo "::group::evidence"
  adb shell dumpsys activity activities 2>/dev/null | grep -i "mResumedActivity" | tee "$EVIDENCE/activity.txt" || true
  adb shell pidof "$PKG" > "$EVIDENCE/pid.txt" 2>/dev/null || echo "the app process is not running" > "$EVIDENCE/pid.txt"
  # The crash buffer is small and keeps the fatal exception: the main buffer is
  # overwritten by the polling noise long before the end of the run.
  adb logcat -b crash -d > "$EVIDENCE/logcat-crash.txt" 2>/dev/null || true
  adb logcat -d -t 3000 > "$EVIDENCE/logcat.txt" 2>/dev/null || true
  adb exec-out screencap -p > "$EVIDENCE/screen.png" 2>/dev/null || true
  echo "::endgroup::"
}

echo "::group::readiness: the device"
adb wait-for-device || fail "the emulator never came up"
booted=""
for _ in $(seq 1 "$BOOT_TIMEOUT"); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
    booted="yes"
    break
  fi
  sleep 1
done
[ -n "$booted" ] || fail "the emulator did not finish booting in ${BOOT_TIMEOUT}s"
echo "booted"

echo "::group::readiness: install"
adb install -r "$APK" || fail "the APK could not be installed"
echo "::endgroup::"

echo "::group::readiness: start the app"
adb shell am start -W -n "$PKG/.MainActivity" > "$EVIDENCE/am-start.txt" 2>&1 || fail "the app could not be started"
pid=""
for _ in $(seq 1 "$PID_TIMEOUT"); do
  pid="$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')"
  [ -n "$pid" ] && break
  sleep 1
done
[ -n "$pid" ] || fail "the app process did not start in ${PID_TIMEOUT}s"
echo "pid=$pid"

# The first screen must appear: the login screen (the E2E mode signs in with a
# mock, so the app lands on the tabs - either is a valid first screen).
screen=""
for _ in $(seq 1 "$SCREEN_TIMEOUT"); do
  if adb shell uiautomator dump /sdcard/window.xml > /dev/null 2>&1 &&
     adb pull /sdcard/window.xml "$EVIDENCE/window.xml" > /dev/null 2>&1; then
    if grep -q "today-screen\|login-screen\|compat-screen" "$EVIDENCE/window.xml" 2>/dev/null; then
      screen="yes"
      break
    fi
  fi
  sleep 2
done
[ -n "$screen" ] || fail "no first screen appeared in ${SCREEN_TIMEOUT}s"
echo "the first screen is on the device"
echo "::endgroup::"

status=0
for flow in .maestro/*.yaml; do
  echo "::group::${flow}"
  if ! timeout "$FLOW_TIMEOUT" maestro test "${flow}"; then
    echo "::error::the flow failed: ${flow}"
    status=1
  fi
  echo "::endgroup::"
done

dump_evidence
exit "$status"
