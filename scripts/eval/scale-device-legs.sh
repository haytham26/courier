#!/usr/bin/env bash
# The device legs of the scale run (the founder directive 2026-11-10, item 5,
# items 3 and 4): the monkey/stress run over every screen, the permissions
# revoked mid-shift, the low-battery mode, and the offline run.
#
#   bash scripts/eval/scale-device-legs.sh [-s <serial>] [--events 3000]
#                                          [--seed 20261111] [--out <dir>]
#
# WHY A SCRIPT AND NOT A TEST: these legs need a real Android device, and the
# gate for them is the CI AVDs (`.github/workflows/android-e2e.yml`, which the
# lead session owns - a new workflow job is the lead's to add). The device that
# was connected on this PC (the founder's BlueStacks, 127.0.0.1:5555) refuses
# Maestro (BUG-303: its adb bridge closes the persistent shell,v2 stream
# Maestro's dadb holds open), so the driver below is the HAND-ROLLED one-shot
# adb idiom BUG-303 recorded: every step is one `adb shell` command
# (uiautomator dump, input tap, input swipe), never a stream Maestro would
# keep open.
#
# WHAT IT MEASURES, and what it refuses to claim:
#   - the monkey's event count and seed, per screen;
#   - the crashes (the crash buffer's tombstones, whose first OUR frame is
#     named) and the ANRs (the processes dump and the traces directory);
#   - the permissions revoked and re-granted mid-shift, and what the app
#     answered with while they were gone (the screen dump is the evidence);
#   - the low-battery mode, and the run under it;
#   - the offline run, with the delivery recorded and held.
#
# A red (a crash, an ANR, a lost delivery) is a BUG with a number and a
# red-first fix, never a note in this script's output. A screen that never
# answers its testID fails the leg loudly: a screen that cannot be reached is
# a BUG, and a leg that quietly skips a screen proves nothing.
set -uo pipefail

SERIAL=""
EVENTS=3000
SEED=20261111
OUT="docs/evidence/scale-tests/device"
PKG="com.courier.copilot"
while [ $# -gt 0 ]; do
  case "$1" in
    -s) SERIAL="$2"; shift 2 ;;
    --events) EVENTS="$2"; shift 2 ;;
    --seed) SEED="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -n "$SERIAL" ]; then ADB="adb -s $SERIAL"; else ADB="adb"; fi

mkdir -p "$OUT"
fail() { echo "::error::$1" >&2; exit 1; }

command -v adb >/dev/null 2>&1 || fail "adb is not on the PATH"
$ADB shell true >/dev/null 2>&1 || fail "no device answers on ${SERIAL:-the default adb target}"

MODEL="$($ADB shell getprop ro.product.model | tr -d '\r')"
RELEASE="$($ADB shell getprop ro.build.version.release | tr -d '\r')"
SDK="$($ADB shell getprop ro.build.version.sdk | tr -d '\r')"
ABI="$($ADB shell getprop ro.product.cpu.abi | tr -d '\r')"
VERSION="$($ADB shell dumpsys package "$PKG" | grep -m1 versionName | tr -d '\r')"
{
  echo "device: $MODEL"
  echo "android: $RELEASE (api $SDK, $ABI)"
  echo "serial: ${SERIAL:-the default adb target}"
  echo "package: $PKG ($VERSION)"
  echo "monkey: ${EVENTS} events per screen, seed $SEED"
  echo "maestro: BUG-303 refuses it on the BlueStacks bridge; this driver is one-shot adb"
} | tee "$OUT/device.txt"

# The screens, as `screen|the testID that proves it|the way in`. The testIDs
# are the same contract the Maestro flows use, so a screen that disappears
# fails the leg rather than being skipped.
SCREENS_FILE="$OUT/screens.txt"
cat > "$SCREENS_FILE" <<'SCREENS'
welcome|welcome-screen|launch
today|today-screen|launch
route|tab-stops|tap:tab-stops
map|tab-map|tap:tab-map
account|tab-settings|tap:tab-settings
driving|driving-screen|tap:today-go
delivered|delivered-screen|slide:driving-slide
summary|summary-screen|tap:today-end-of-day
scan|today-scan|tap:today-scan
SCREENS

theDump() { $ADB shell cat /sdcard/scale.xml 2>/dev/null | tr -d '\r'; }

dumpTheScreen() { $ADB shell uiautomator dump /sdcard/scale.xml >/dev/null 2>&1; }

theCentreOf() {
  local id="$1" line bounds
  dumpTheScreen
  line="$(theDump | grep "resource-id=\"$PKG:id/$id\"" | head -1)"
  if [ -z "$line" ]; then echo "0 0"; return; fi
  bounds="$(echo "$line" | sed -n 's/.*bounds="\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]".*/\1 \2 \3 \4/p')"
  echo "$bounds" | awk '{print int(($1+$3)/2) " " int(($2+$4)/2)}'
}

theSlideOf() {
  local id="$1" line bounds
  dumpTheScreen
  line="$(theDump | grep "resource-id=\"$PKG:id/$id\"" | head -1)"
  if [ -z "$line" ]; then echo "0 0"; return; fi
  bounds="$(echo "$line" | sed -n 's/.*bounds="\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]".*/\1 \2 \3 \4/p')"
  echo "$bounds" | awk '{print int($1+($3-$1)*0.1) " " int(($2+$4)/2) " " int($1+($3-$1)*0.9) " " int(($2+$4)/2)}'
}

# The run sheet opens at peek, and the actions sit below its fold: the repo’s
# own convention (`.maestro/common/reveal-and-tap.yaml`) is to raise it with its
# grabber first, the same way the flows do.
raiseTheSheet() {
  local grabber
  dumpTheScreen
  grabber="$(theDump | grep "resource-id=\"$PKG:id/today-sheet-grabber\"" | head -1)"
  if [ -n "$grabber" ]; then
    $ADB shell input swipe 540 560 540 1500 >/dev/null 2>&1 || true
  fi
}
crashes() { $ADB logcat -b crash -d 2>/dev/null | grep -c "FATAL EXCEPTION\|Fatal signal" || true; }
anrs() { $ADB shell "ls /data/anr/ 2>/dev/null | wc -l" | tr -d '\r'; }
ourCrashes() { $ADB logcat -b crash -d 2>/dev/null | grep -c "com.courier" || true; }

reachIt() {
  local via="$1" target point
  case "$via" in
    launch) $ADB shell am start -W -n "$PKG/.MainActivity" >/dev/null 2>&1 ;;
    tap:*)
      target="${via#tap:}"
      case "$target" in today-go|today-scan|today-end-of-day|today-mark-delivered) raiseTheSheet ;; esac
      point="$(theCentreOf "$target")"
      $ADB shell input tap "$point" >/dev/null 2>&1 ;;
    slide:*)
      target="${via#slide:}"
      point="$(theSlideOf "$target")"
      $ADB shell input swipe "$point" >/dev/null 2>&1 ;;
  esac
}

# --- leg 1: the monkey over every screen ----------------------------------
echo "::group::the monkey over every screen"
while IFS='|' read -r screen testid via; do
  [ -z "$screen" ] && continue
  reachIt "$via"
  seen=""
  for _ in $(seq 1 30); do
    if theDump | grep -q "$testid"; then seen="yes"; break; fi
    sleep 1
  done
  if [ -z "$seen" ]; then
    echo "the screen $screen never answered $testid: RED, not skipped" | tee -a "$OUT/monkey.txt"
    $ADB exec-out screencap -p > "$OUT/monkey-${screen}-miss.png" 2>/dev/null || true
    continue
  fi
  before="$(crashes)"
  $ADB shell monkey -p "$PKG" -v -s "$SEED" "$EVENTS" > "$OUT/monkey-${screen}.txt" 2>&1
  after="$(crashes)"
  {
    echo "screen=$screen seed=$SEED events=$EVENTS crashes_before=$before crashes_after=$after anrs=$(anrs) our_frames=$(ourCrashes)"
  } | tee -a "$OUT/monkey.txt"
  $ADB exec-out screencap -p > "$OUT/monkey-${screen}.png" 2>/dev/null || true
done < "$SCREENS_FILE"
echo "::endgroup::"

# --- leg 2: the permissions revoked mid-shift ------------------------------
echo "::group::the permissions revoked and re-granted mid-shift"
: > "$OUT/permissions.txt"
for permission in android.permission.ACCESS_FINE_LOCATION android.permission.CAMERA android.permission.RECORD_AUDIO; do
  $ADB shell pm grant "$PKG" "$permission" >/dev/null 2>&1 || true
done
reachIt "tap:today-go"
sleep 3
for permission in android.permission.ACCESS_FINE_LOCATION android.permission.CAMERA android.permission.RECORD_AUDIO; do
  $ADB shell pm revoke "$PKG" "$permission" >/dev/null 2>&1 || true
  echo "revoked $permission" >> "$OUT/permissions.txt"
done
sleep 3
echo "the screen with every permission gone:" >> "$OUT/permissions.txt"
theDump > "$OUT/permissions-revoked.xml" 2>/dev/null || true
crashes_now="$(crashes)"
anrs_now="$(anrs)"
echo "crashes=$crashes_now anrs=$anrs_now" >> "$OUT/permissions.txt"
# The app has to answer, not die: a burst of events on the screen it is on.
$ADB shell monkey -p "$PKG" -v -s "$((SEED + 1))" "$EVENTS" > "$OUT/permissions-monkey.txt" 2>&1
echo "after the burst: crashes=$(crashes) anrs=$(anrs)" >> "$OUT/permissions.txt"
for permission in android.permission.ACCESS_FINE_LOCATION android.permission.CAMERA android.permission.RECORD_AUDIO; do
  $ADB shell pm grant "$PKG" "$permission" >/dev/null 2>&1 || true
  echo "re-granted $permission" >> "$OUT/permissions.txt"
done
cat "$OUT/permissions.txt"
echo "::endgroup::"

# --- leg 3: the low-battery mode -------------------------------------------
echo "::group::the low-battery mode"
$ADB shell dumpsys battery unplug >/dev/null 2>&1 || true
$ADB shell dumpsys battery set level 8 >/dev/null 2>&1 || true
sleep 2
$ADB shell cmd power set-mode 1 >/dev/null 2>&1 || true
sleep 2
$ADB shell "dumpsys battery | grep -E 'level|powered'" > "$OUT/battery.txt" 2>/dev/null || true
$ADB shell monkey -p "$PKG" -v -s "$((SEED + 2))" "$EVENTS" > "$OUT/battery-monkey.txt" 2>&1
{
  echo "crashes=$(crashes) anrs=$(anrs)"
  $ADB shell "dumpsys battery | grep -E 'level|powered'" 2>/dev/null | tr -d '\r'
} >> "$OUT/battery.txt"
$ADB shell cmd power set-mode 0 >/dev/null 2>&1 || true
$ADB shell dumpsys battery reset >/dev/null 2>&1 || true
cat "$OUT/battery.txt"
echo "::endgroup::"

# --- leg 4: the offline run ------------------------------------------------
echo "::group::the offline run"
$ADB shell svc wifi disable >/dev/null 2>&1 || true
$ADB shell svc data disable >/dev/null 2>&1 || true
sleep 3
reachIt "tap:today-go"
sleep 2
# The delivery with no signal: the slide marks the run and the event is held.
point="$(theSlideOf driving-slide)"
$ADB shell input swipe "$point" >/dev/null 2>&1 || true
sleep 4
theDump > "$OUT/offline-delivered.xml" 2>/dev/null || true
$ADB exec-out screencap -p > "$OUT/offline-delivered.png" 2>/dev/null || true
{
  echo "the app's own answer with no signal, from the a11y dump:"
  theDump 2>/dev/null | grep -o 'text="[^"]*"' | head -20
  echo "crashes=$(crashes) anrs=$(anrs)"
} > "$OUT/offline.txt"
cat "$OUT/offline.txt"
$ADB shell svc wifi enable >/dev/null 2>&1 || true
$ADB shell svc data enable >/dev/null 2>&1 || true
echo "::endgroup::"

echo "the device legs are written to $OUT"
