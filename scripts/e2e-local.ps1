# Reproduces the Android E2E run locally (the same pipeline the CI runs).
#
#   powershell -ExecutionPolicy Bypass -File scripts\e2e-local.ps1
#
# It needs: the Android SDK, an emulator (API 34, google_apis, x86_64), the
# Maestro CLI and a release APK. The app runs in the E2E mode (local mocks), so
# no Metro, no auth service and no API are involved.
$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$apk = "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
if (-not (Test-Path $apk)) {
    Write-Output "The release APK is missing ($apk)."
    Write-Output "Build it first: pnpm --filter mobile exec expo prebuild --platform android --no-install"
    Write-Output "then: cd apps/mobile/android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64"
    exit 1
}

$maestro = Get-Command maestro -ErrorAction SilentlyContinue
if (-not $maestro) {
    Write-Output "Maestro is not on the PATH. Install it: https://get.maestro.mobile.dev"
    exit 1
}

$device = (& adb devices | Select-String "emulator-\d+").ToString().Split("`t")[0]
if (-not $device) {
    Write-Output "No emulator is running. Start one (API 34, google_apis, x86_64) and try again."
    exit 1
}

Write-Output "Installing the APK on $device"
& adb -s $device install -r $apk

Write-Output "Starting the app"
& adb -s $device shell am start -W -n "com.courier.copilot/.MainActivity" | Out-Null

Write-Output "Running the flows"
$failed = @()
foreach ($flow in (Get-ChildItem ".maestro" -Filter "*.yaml" | Sort-Object Name)) {
    Write-Output "== $($flow.Name)"
    & maestro test $flow.FullName
    if ($LASTEXITCODE -ne 0) {
        $failed += $flow.Name
    }
}

if ($failed.Count -gt 0) {
    Write-Output "FAILED: $($failed -join ', ')"
    exit 1
}

Write-Output "All the flows passed."
