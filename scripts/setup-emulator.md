# Courier Copilot - Android SDK & Emulator Setup Script

This script sets up the Android SDK and emulator for Courier Copilot development.

## Prerequisites
- Windows with winget
- Administrator privileges for some steps

## Usage
```powershell
# Run as Administrator
.\scripts\setup-emulator.ps1
```

```bash
# Linux/macOS
./scripts/setup-emulator.sh
```

## What it does
1. Installs Android Studio (Windows) or command-line tools (Linux/macOS)
2. Sets up Android SDK with required platforms and build tools
3. Creates an AVD (Android Virtual Device) for testing
4. Configures environment variables
5. Verifies the setup

## Environment Variables
Add these to your shell profile (`.bashrc`, `.zshrc`, PowerShell profile):
```powershell
$env:ANDROID_HOME = "C:\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\cmdline-tools\latest\bin"
```

## Emulator Configuration
- Device: Pixel 8 (or latest Pixel)
- System Image: Google APIs Play Store x86_64
- API Level: 35 (or latest stable supported by Expo)
- Microphone: Virtual microphone uses host audio input (for voice testing)
- Location: GPX route for Christchurch testing (in tests/fixtures/)

## Troubleshooting
- If Hyper-V/HAXM/KVM not available: Build APK via GitHub Actions instead
- If emulator fails to start: Check `emulator -avd courier_pixel -verbose`
- For audio issues: Extended controls → Microphone → "Virtual microphone uses host audio input"