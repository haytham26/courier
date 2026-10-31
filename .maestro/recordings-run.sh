#!/usr/bin/env bash
# The recording keeper of §13.8.7 (MASTER_EXECUTION §13.8.6 evidence rule).
#
# For every flow in `.maestro/recordings/` (one per screen, named after its
# reference: `03-today.yaml` composes against `03-today.html`): two passes —
# light and dark (`adb shell cmd uimode night`, the app relaunches under the
# device setting, the same way a courier flips the phone) — each pass keeps
# the mp4 of the screenrecord, the final screencap and the frame stats
# (dumpsys gfxinfo; ADR-008 §4 tunes the motion tokens against THESE files,
# the change lands there, never in a screen). The pass that ends in the
# driving flow uses its own night reference (12-driving-night).
#
# The composition: the light screencap beside the reference, then the dark
# screencap beside it (or the night drive beside 12-driving-night), every
# column scaled to the same height — all of it under
# `.maestro/recordings/`, riding the `screen-recordings` artifact.

set -u

REC=.maestro/recordings
mkdir -p "$REC"
status=0

for flow in "$REC"/*.yaml; do
  name="$(basename "$flow" .yaml)"
  light_ref="$name"
  dark_ref="$name"
  case "$name" in
    04-driving) dark_ref="12-driving-night" ;;
  esac

  for mode in light dark; do
    prefix="$name-$mode"
    night=no
    ref="$light_ref"
    [ "$mode" = dark ] && night=yes && ref="$dark_ref"

    echo "::group::$prefix (reference: $ref)"
    adb shell cmd uimode night "$night" || true
    adb shell am force-stop "$PKG" || true

    # The recording runs on the device while the flow walks the screen and
    # settles it back at the state the reference shows.
    adb shell screenrecord --time-limit 90 --bit-rate 8000000 "/sdcard/$prefix.mp4" &
    record_pid=$!
    sleep 3
    if maestro test "$flow"; then
      echo "the flow passed: $flow ($mode)"
    else
      echo "::error::the flow failed: $flow ($mode)"
      status=1
    fi

    # screenrecord finalises the file when it is interrupted.
    adb shell pkill -INT screenrecord || true
    wait "$record_pid" || true
    sleep 1

    # The screencap waits out the settle of the last spring: the static
    # compare must show the resting state, not a frame of the snap.
    sleep 2
    adb shell screencap -p "/sdcard/$prefix.png"
    adb pull "/sdcard/$prefix.mp4" "$REC/$prefix.mp4" || true
    adb pull "/sdcard/$prefix.png" "$REC/$prefix.png" || true
    adb shell rm -f "/sdcard/$prefix.mp4" "/sdcard/$prefix.png" || true

    # The frame-time evidence of this pass (the Drive slice's §13.8.7 trace).
    adb shell dumpsys gfxinfo "$PKG" framestats > "$REC/fps-$prefix.txt" || true
    echo "::endgroup::"
  done

  # The composition: screencap beside the reference, light and dark.
  # BUG-097 (C1 audit, squad 6 finding 5, accepted high, consequence
  # amended): the composition only warned, so a job could be green with 13
  # blank (or absent) reference images - the exact "a green run that proves
  # nothing" the audit names. A failed composition is now a failure of the
  # same job: the status the script exits with is what the workflow sees.
  light="$REC/$name-light.png"
  dark="$REC/$name-dark.png"
  if [ -f "$light" ] && [ -f "$dark" ]; then
    ffmpeg -hide_banner -loglevel error \
      -i "$light" -i "render/$light_ref.png" \
      -i "$dark" -i "render/$dark_ref.png" \
      -filter_complex \
      "[0]scale=-2:800[a-light];[1]scale=-2:800[a-ref];[2]scale=-2:800[b-light];[3]scale=-2:800[b-ref];[a-light][a-ref]hstack=inputs=2[l];[b-light][b-ref]hstack=inputs=2[d]" \
      -map "[l]" -frames:v 1 "$REC/$name-light-beside.png" \
      -map "[d]" -frames:v 1 "$REC/$name-dark-beside.png" \
      && echo "composed: $name" \
      || { echo "::error::composition failed for $name"; status=1; }
  else
    echo "::error::no screencaps for $name; the composition skipped"
    status=1
  fi
done

ls -la "$REC"
exit "$status"
