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

# BUG-066: the cold-start sweep (exp branch only, SWEEP_COUNT>0).
#
# The api-34 legs die 1 to 2 seconds into a cold start with a native memory
# error (SIGSEGV, gwp_asan::GuardedPoolAllocator::deallocate, libhermesvm.so;
# runs 40274121944 and 40334465490). GWP-ASan samples a random fraction of the
# allocations, so a single launch says nothing and a green run clears nothing:
# the sweep launches the app SWEEP_COUNT times and MEASURES the rate, and it
# keeps the first crash's tombstone (with the GWP-ASan report in it, when the
# report completes). The rate is evidence only - the sweep never fails the run;
# the flows below are the gate. It runs on both legs so the api-35 comparison
# is a number, not a story.
sweep_cold_start() {
  local total death i up sig
  total="${SWEEP_COUNT:-0}"
  echo "::notice::BUG-066 sweep: SWEEP_COUNT=$total (the emulator-runner's script sees the step env)"
  [ "$total" -gt 0 ] || return 0
  echo "::group::the cold-start sweep (BUG-066)"
  death=0
  for i in $(seq 1 "$total"); do
    adb shell am force-stop "$PKG" 2>/dev/null || true
    adb shell am start -W -n "$PKG/.MainActivity" > /dev/null 2>&1
    up=""
    for _ in $(seq 1 30); do
      if adb shell pidof "$PKG" > /dev/null 2>&1 &&
         adb shell uiautomator dump /sdcard/window.xml > /dev/null 2>&1 &&
         adb exec-out cat /sdcard/window.xml 2>/dev/null | grep -q 'today-screen\|login-screen\|compat-screen'; then
        up="ok"
        break
      fi
      adb shell pidof "$PKG" > /dev/null 2>&1 || { up="dead"; break; }
      sleep 1
    done
    [ -n "$up" ] || up="timeout"
    if [ "$up" != "ok" ]; then
      death=$((death + 1))
      if [ "$death" -eq 1 ]; then
        # The first death is kept whole: the crash buffer carries the tombstone
        # (the GWP-ASan report with its Cause line and both traces is in it
        # when the report path completes), and the main buffer is grepped for
        # the report so a report without a tombstone is kept too.
        adb logcat -b crash -d > "$EVIDENCE/sweep-crash-1.txt" 2>/dev/null || true
        adb logcat -d -t 5000 > "$EVIDENCE/sweep-logcat-1.txt" 2>/dev/null || true
        sig="$(grep -m1 'Fatal signal' "$EVIDENCE/sweep-crash-1.txt" 2>/dev/null || echo "$up")"
        echo "sweep $i: $up - kept as evidence - $sig"
      else
        echo "sweep $i: $up"
      fi
    else
      echo "sweep $i: ok"
    fi
  done
  {
    echo "run-summary: sweep=total=$total deaths=$death"
    echo "run-summary: sweep_note=BUG-066: $death of $total cold starts failed on this leg"
  } | tee -a "$EVIDENCE/sweep-summary.txt"
  echo "::endgroup::"
}


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

sweep_cold_start

status=0
for flow in .maestro/*.yaml; do
  echo "::group::${flow}"
  if ! timeout "$FLOW_TIMEOUT" maestro test "${flow}"; then
    echo "::error::the flow failed: ${flow}"
    status=1
  fi
  echo "::endgroup::"
done

# The screens' gate (§13.8.7) starts from the emulator shot each flow
# captures: the takeScreenshot files land next to the flows' cwd.
cp ./*.png "$EVIDENCE/" 2>/dev/null || true

dump_evidence
write_summary "$([ "$status" -eq 0 ] && echo green || echo red)"
exit "$status"
