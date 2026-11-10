#!/usr/bin/env bash
# The still-capture body of the P4 visual-baselines job (BUG-270's other half,
# the founder directive item 7).
#
# The device is already booted by the caller (android-emulator-runner), the APK is
# installed and the permissions are granted by .maestro/visual-baselines-boot.sh.
# This script captures, per recording flow in .maestro/recordings/ (one per screen,
# named after its reference), the two resting-state screencaps the design contract
# asks for, as the manifest's own names: <screen>-<mode>-<view>.png, where VIEW is
# the job matrix's view ("large" or "small-200pct") and FONT_SCALE is its font
# scale (1.0 or 2.0, a system setting the app reads at launch).
#
# The font scale is restored to 1.0 at the end: this AVD is the CI one, and the
# next leg inherits a clean device either way (no snapshot: -no-snapshot).

set -u

REC=.maestro/visual-baselines
VIEW="${VIEW:-large}"
FONT_SCALE="${FONT_SCALE:-1.0}"
PKG="${PKG:-com.courier.copilot}"

mkdir -p "$REC"
status=0

for flow in .maestro/recordings/*.yaml; do
  name="$(basename "$flow" .yaml)"
  for mode in day night; do
    out="$REC/$name-$mode-$VIEW.png"
    night=no
    [ "$mode" = night ] && night=yes

    echo "::group::$name $mode $VIEW (font scale $FONT_SCALE)"
    # The font scale is a system setting read at launch, so it is set before the
    # app starts; the ui mode is the app's own night switch (and the flow's).
    adb shell settings put system font_scale "$FONT_SCALE"
    adb shell cmd uimode night "$night" || true
    adb shell am force-stop "$PKG" || true

    if maestro test "$flow"; then
      echo "the flow passed: $flow ($mode, $VIEW, font $FONT_SCALE)"
    else
      echo "::error::the flow failed: $flow ($mode, $VIEW, font $FONT_SCALE)"
      status=1
    fi

    # The screencap waits out the settle of the last spring: the static compare
    # must show the resting state, not a frame of the snap.
    sleep 2
    adb shell screencap -p "/sdcard/$name-$mode-$VIEW.png"
    adb pull "/sdcard/$name-$mode-$VIEW.png" "$out" || true
    adb shell rm -f "/sdcard/$name-$mode-$VIEW.png"
    echo "::endgroup::"
  done
done

adb shell settings put system font_scale 1.0
ls -la "$REC"
exit "$status"
