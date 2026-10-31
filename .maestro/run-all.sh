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
  write_summary red "$1"
  exit 1
}

# BUG-051 (a summary, not a heal — the guard below is temporary): every
# relaunch is counted and named in the run summary, together with the verdict
# on the crash signature it rode. The summary lands in the evidence dir and
# in the GitHub job summary when the runner provides one.
write_summary() {
  {
    echo "run-summary: status=$1"
    echo "run-summary: relaunches=$relaunches"
    [ -n "${relaunch_note:-}" ] && echo "run-summary: ${relaunch_note}"
    [ -n "${2:-}" ] && echo "run-summary: fail=$2"
  } | tee "$EVIDENCE/summary.txt"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat "$EVIDENCE/summary.txt" >> "$GITHUB_STEP_SUMMARY" || true
  fi
}

relaunches=0
relaunch_note=""

# The tombstone of the newest fatal, from its "Fatal signal" line to the end
# of the crash buffer, into crash-last.txt. The verdict: the KNOWN image crash
# of BUG-051 is a SIGTRAP at the Chromium WebView factory init - the tombstone
# carries the libmonochrome library and the WebView factory frames through the
# CookieManager chain. A death whose signature is not that one stops the run
# immediately: the temporary guard may only ride the image crash, nothing else.
relaunch_signature() {
  local start
  start=$(grep -n "Fatal signal" "$EVIDENCE/logcat-crash.txt" 2>/dev/null | tail -1 | cut -d: -f1)
  [ -n "$start" ] || return 1
  sed -n "${start},\$p" "$EVIDENCE/logcat-crash.txt" > "$EVIDENCE/crash-last.txt"
  grep -q "SIGTRAP" "$EVIDENCE/crash-last.txt" || return 1
  grep -Eq "libmonochrome|WebViewChromiumFactoryProvider|getCookieManager" "$EVIDENCE/crash-last.txt" || return 1
  return 0
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

# The permissions the compatibility screen exercises are granted up front: the
# system dialog would sit on top of the screen the flow has to read.
# The scanner's camera is granted too (the app declares it from 06 on): the
# system dialog would sit over the scanner the way it sits over the voice
# prompt, and the grant is what the flow's feed asserts against.
adb shell pm grant "$PKG" android.permission.CAMERA >/dev/null 2>&1 || true
adb shell pm grant "$PKG" android.permission.RECORD_AUDIO >/dev/null 2>&1 || true
adb shell pm grant "$PKG" android.permission.ACCESS_FINE_LOCATION >/dev/null 2>&1 || true
adb shell pm grant "$PKG" android.permission.ACCESS_COARSE_LOCATION >/dev/null 2>&1 || true
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
# mock, so the app lands on the tabs - either is a valid first screen). The
# emulator image's own Chromium can SIGTRAP the app seconds into a cold
# launch (BUG-051, run 39905489019: libmonochrome through the WebView
# factory, the crash buffer carried it). The relaunch below is a TEMPORARY
# guard, and a death is inspected BEFORE it is ridden: the tombstone of the
# newest fatal must be the KNOWN image crash (SIGTRAP at the WebView factory
# init - React Native's ForwardingCookieHandler forwards every network
# request to android.webkit.CookieManager, and the first touch starts
# Chromium on the request thread). Any other signature stops the run
# immediately with that signature; the known one is ridden once, every
# relaunch is counted in the run summary, and a death after the relaunch
# still fails: the retry cannot hide a reproducible crash, image or not.
screen=""
for _ in $(seq 1 "$SCREEN_TIMEOUT"); do
  if adb shell uiautomator dump /sdcard/window.xml > /dev/null 2>&1 &&
     adb pull /sdcard/window.xml "$EVIDENCE/window.xml" > /dev/null 2>&1 &&
     grep -q "today-screen\|login-screen\|compat-screen" "$EVIDENCE/window.xml" 2>/dev/null; then
    screen="yes"
    break
  fi
  pid_now="$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')"
  if [ -z "$pid_now" ]; then
    adb logcat -b crash -d > "$EVIDENCE/logcat-crash.txt" 2>/dev/null || true
    if relaunch_signature; then
      relaunches=$((relaunches + 1))
      relaunch_note="the relaunch rode the KNOWN image crash of BUG-051 (SIGTRAP at the WebView factory, libmonochrome; the tombstone is evidence/crash-last.txt)"
    else
      sig="$(grep -m1 'Fatal signal' "$EVIDENCE/logcat-crash.txt" 2>/dev/null || echo 'no fatal found in the crash buffer')"
      fail "the app died before the first screen with an UNKNOWN crash signature: ${sig}"
    fi
    if [ "$relaunches" -le 1 ]; then
      echo "the app process died before the first screen: the signature is the KNOWN image crash (BUG-051); relaunch ${relaunches}"
      adb shell am start -W -n "$PKG/.MainActivity" >> "$EVIDENCE/am-start.txt" 2>&1 || true
    else
      fail "the KNOWN image crash of BUG-051 fired twice (relaunches=${relaunches}); the temporary relaunch cannot ride a reproducible crash"
    fi
  fi
  sleep 2
done
[ -n "$screen" ] || fail "no first screen appeared in ${SCREEN_TIMEOUT}s"
echo "the first screen is on the device"
echo "::endgroup::"

status=0
# The per-flow result file: one line per flow, machine-readable, so the nightly
# health run (PLAYBOOK 17.4) can count a pass rate instead of arguing about a
# flake. It is evidence, never a verdict: the run's status is decided below.
FLOWS_RESULT="$EVIDENCE/flows.txt"
: > "$FLOWS_RESULT"
# The suite is the flows in THIS folder, and it is the E2E stack's own: no
# Metro, no auth service, no API. The `a1/` subfolder is the no-mock job's own
# (`.maestro/run-a1.sh` runs those three against the compose stack), and a glob
# of one folder level is what keeps them out: the first run of that job had
# them in this list, they failed on the E2E build against a server that is not
# there, and they took four other flows of that leg down with them.
for flow in .maestro/*.yaml; do
  name="$(basename "${flow}")"
  echo "::group::${flow}"
  if ! timeout "$FLOW_TIMEOUT" maestro test "${flow}"; then
    echo "::error::the flow failed: ${flow}"
    echo "flow=${name} status=fail" >> "$FLOWS_RESULT"
    status=1
    # The failure's own evidence: Maestro writes the hierarchy and the
    # screenshot of the moment the flow failed into its own test dir, and the
    # run's dump at the END loses it (logcat keeps the last 3000 lines and the
    # last flow has launched the app fresh by then). BUG-062's root cause - the
    # summary screen dying at mount for want of a ChosenProvider - came out of
    # exactly this dump, which is why the runner keeps it.
    newest="$(ls -1dt "$HOME"/.maestro/tests/*/ 2>/dev/null | head -1)"
    if [ -n "$newest" ]; then
      # The dump is named after the flow's own `name:`, which can carry a
      # character the artifact upload refuses (a colon: "A1 online: the app
      # signs up ..." made the whole evidence upload fail with "The path for
      # one of the files in artifact is not valid"). Sanitise it here, so the
      # name of a flow can never decide whether the evidence is uploaded.
      safe="$(basename "$(dirname "$newest")" | tr -c 'A-Za-z0-9._-' '-')"
      dest="$EVIDENCE/maestro-failure-${safe}"
      mkdir -p "$dest"
      cp -r "$newest". "$dest/" 2>/dev/null || true
      echo "the failure's own dump is in $dest"
    fi
  else
    echo "flow=${name} status=pass" >> "$FLOWS_RESULT"
  fi
  echo "::endgroup::"
done

# The screens' gate (§13.8.7) starts from the emulator shot each flow
# captures: the takeScreenshot files land next to the flows' cwd.
cp ./*.png "$EVIDENCE/" 2>/dev/null || true

dump_evidence
write_summary "$([ "$status" -eq 0 ] && echo green || echo red)"
exit "$status"
