#!/usr/bin/env bash
# Runs every Maestro flow against the emulator and the freshly installed APK.
# Executed by reactivecircus/android-emulator-runner (the emulator is running).
set -uo pipefail

cd "$(dirname "$0")/.."

AUTH_PORT=3001
APK="apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk"

echo "::group::start the auth service"
export AUTH_DATABASE_URL="memory://"
export BETTER_AUTH_SECRET="ci-only-secret-value-long-enough-32-chars"
export BETTER_AUTH_URL="http://0.0.2.2:${AUTH_PORT}"
export AUTH_TRUSTED_ORIGINS="exp://,http://localhost:3001"
export PORT="${AUTH_PORT}"
pnpm --filter @courier/auth start &
AUTH_PID=$!
echo "::endgroup::"

cleanup() {
  kill "${AUTH_PID}" 2>/dev/null || true
}
trap cleanup EXIT

echo "::group::wait for the auth service"
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${AUTH_PORT}/api/auth/jwks" > /dev/null; then
    echo "auth service is up"
    break
  fi
  sleep 1
done
echo "::endgroup::"

echo "::group::install the APK"
adb install -r "${APK}"
echo "::endgroup::"

# The diagnostics every run leaves behind: what the app did, and the logcat.
echo "::group::diagnostics"
adb shell dumpsys activity activities | grep -i "mResumedActivity" || true
adb shell pidof com.courier.copilot || echo "the app process is NOT running"
adb logcat -d -t 800 > maestro-logcat.txt 2>/dev/null || true
echo "::endgroup::"

status=0
for flow in .maestro/*.yaml; do
  echo "::group::${flow}"
  if ! timeout 300 maestro test "${flow}"; then
    echo "flow failed: ${flow}"
    status=1
  fi
  echo "::endgroup::"
done

# The logcat after the flows shows a crash, if there was one.
adb logcat -d -t 2000 > maestro-logcat-after.txt 2>/dev/null || true

exit "${status}"
