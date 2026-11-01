#!/usr/bin/env bash
# The A1 job's runner: the no-mock flow, in three halves (the audit's
# done-when).
#
# The job has already started the API, the auth service and Postgres in compose
# (infra/compose.ci.yml) and built the APK with no E2E flag, so this script's
# only jobs are the ones the device owns: install the APK, drive the three
# halves of the flow with the network toggled between them, and leave the
# evidence for the assertion step that follows.
#
#   online  - the app signs up on the real auth service, the real API seeds the
#             day, three deliveries are sent while there is signal
#   offline - the network is taken away, a fourth delivery is recorded on the
#             phone and held in the outbox
#   sync    - the network comes back and the outbox sends what it held
#
# The emulator's adb is the one the runner action installed (this script runs
# inside the runner's own step), and every adb call is written so a failure is
# loud rather than silent: the whole point of this job is that a real delivery
# really landed.
set -euo pipefail

# The APK's address is the job's own build, not the legs' artifact. The two
# e2e legs install `apk/app-release.apk` - the APK the build job uploads and
# they download (run-all.sh) - but this job builds its own release APK with
# `gradle assembleRelease` inside apps/mobile/android, and this script runs
# from the repository root, so the route to gradle's output is the whole one.
# The first green-emulator run proved the wrong path loudly:
# `adb install -r app/build/outputs/apk/release/app-release.apk` answered
# "failed to stat ... No such file or directory" seconds after the boot.
APK="apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  echo "::error::the no-mock APK is not at $APK - the a1 job's gradle output is not where this script installs from"
  exit 1
fi
EVIDENCE=".maestro/evidence"
PKG="com.courier.copilot"
mkdir -p "$EVIDENCE"

# The device's own dump of what it was showing when something failed: the
# activity on top, the process, the crash buffer, the main log and the screen.
# The first flow run against the real server failed at the flow's first
# assertion (`id: welcome-screen is visible`) with nothing but a junit line to
# read - the same blindness BUG-062's dump removed, which is why the legs'
# runner carries this exact function (run-all.sh's dump_evidence).
dump_evidence() {
  echo "::group::A1: evidence"
  adb shell dumpsys activity activities 2>/dev/null | grep -i "mResumedActivity" | tee "$EVIDENCE/activity.txt" || true
  adb shell pidof "$PKG" > "$EVIDENCE/pid.txt" 2>/dev/null || echo "the app process is not running" > "$EVIDENCE/pid.txt"
  adb logcat -b crash -d > "$EVIDENCE/logcat-crash.txt" 2>/dev/null || true
  adb logcat -d -t 3000 > "$EVIDENCE/logcat.txt" 2>/dev/null || true
  adb exec-out screencap -p > "$EVIDENCE/screen.png" 2>/dev/null || true
  echo "::endgroup::"
}

# Maestro's own dump of the moment a flow failed, kept under a name the artifact
# upload accepts - a flow's name can carry a colon, and one character once
# decided whether a run's evidence could be uploaded at all (the legs' runner
# learned it first; this is the same function).
keep_flow_dump() {
  local newest dump_path dump_name safe_name remainder character dest
  newest="$(ls -1dt "$HOME"/.maestro/tests/*/ 2>/dev/null | head -1)"
  [ -n "$newest" ] || return 0
  dump_path="${newest%/}"
  dump_name="${dump_path##*/}"
  safe_name=""
  remainder="$dump_name"
  while [ -n "$remainder" ]; do
    character="${remainder%"${remainder#?}"}"
    remainder="${remainder#?}"
    case "$character" in
      [A-Za-z0-9._-]) safe_name="$safe_name$character" ;;
      *) safe_name="$safe_name-" ;;
    esac
  done
  if [ -z "$safe_name" ]; then
    safe_name="unnamed-dump"
  fi
  dest="$EVIDENCE/maestro-failure-${safe_name}"
  rm -rf "$dest"
  mkdir -p "$dest"
  # Maestro's dump carries a folder named after the flow's own `name:`, and a
  # name can contain a colon - the artifact upload refuses a path with one,
  # which is how this run's evidence was lost the first time (the legs' runner
  # learned the same lesson on the copilot flow). The dump's one inner folder
  # is flattened away: its files keep their names, its folder's do not reach
  # the artifact.
  inner="$(ls -1d "$newest"*/ 2>/dev/null | head -1)"
  if [ -n "$inner" ]; then
    cp -r "$inner". "$dest/" 2>/dev/null || true
  else
    cp -r "$newest". "$dest/" 2>/dev/null || true
  fi
}

echo "::group::A1: install the no-mock APK"
adb install -r "$APK"
echo "::endgroup::"

run_flow() {
  local name="$1"
  echo "::group::A1: $name"
  # The a1 job's own three flows, in their own folder: they are not part of the
  # mock legs' suite (`.maestro/run-all.sh` globs `.maestro/*.yaml`, and a flow
  # that belongs to a different stack must not silently join those legs - the
  # first run of this job proved it, when the glob's three a1 flows ran on the
  # E2E build, failed, and took the other flows of that leg down with them).
  if maestro test ".maestro/a1/${name}.yaml" --format junit --output "$EVIDENCE/${name}-result.xml"; then
    echo "::endgroup::"
  else
    echo "::error::the flow failed: A1 $name - the device's dump is in the evidence"
    dump_evidence
    keep_flow_dump
    echo "::endgroup::"
    exit 1
  fi
}

# The online half. A failure here is a failure of the real round trip, and the
# run stops: there is nothing afterwards to prove.
run_flow "online"

echo "::group::A1: take the network away"
# Both halves of the emulator's connectivity, so the app cannot reach the API
# by either path. The commands are allowed to fail quietly only where the
# device has no such radio (an emulator image with no cellular), which the
# wifi half covers.
adb shell svc wifi disable || true
adb shell svc data disable || true
adb shell svc usb disable || true
sleep 3
echo "network is down"
echo "::endgroup::"

run_flow "offline"

echo "::group::A1: give the network back"
adb shell svc wifi enable || true
adb shell svc data enable || true
adb shell svc usb enable || true
sleep 3
echo "network is back"
echo "::endgroup::"

run_flow "sync"

echo "::group::A1: the flow's own record"
{
  echo "apk=$APK"
  echo "flows=a1/online,a1/offline,a1/sync"
  echo "note=the network was taken away between the online and offline halves, and given back between the offline and sync halves"
} | tee "$EVIDENCE/a1-run.txt"
echo "::endgroup::"
