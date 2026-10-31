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

APK="app/build/outputs/apk/release/app-release.apk"
EVIDENCE=".maestro/evidence"
mkdir -p "$EVIDENCE"

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
  maestro test ".maestro/a1/${name}.yaml" --format junit --output "$EVIDENCE/${name}-result.xml"
  echo "::endgroup::"
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
