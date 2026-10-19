#!/bin/bash
# Courier Copilot - Android SDK & Emulator Setup Script (Linux/macOS)
# Run with: bash scripts/setup-emulator.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Configuration
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
API_LEVEL="35"
SYSTEM_IMAGE="system-images;android-${API_LEVEL};google_apis_playstore;x86_64"
AVD_NAME="courier_pixel"
DEVICE_PROFILE="pixel_8"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    log_error "Unsupported OS: $OSTYPE"
    exit 1
fi

log_info "Setting up Android SDK for Courier Copilot on $OS..."
log_info "ANDROID_HOME: $ANDROID_HOME"

# Create directories
mkdir -p "$ANDROID_HOME/cmdline-tools"
cd "$ANDROID_HOME/cmdline-tools"

# Download command line tools
if [[ ! -d "latest" ]]; then
    log_info "Downloading Android command line tools..."
    curl -L -o cmdline-tools.zip "$CMDLINE_TOOLS_URL"
    unzip -q cmdline-tools.zip
    mv cmdline-tools latest
    rm cmdline-tools.zip
    log_info "Command line tools installed"
else
    log_info "Command line tools already present"
fi

# Add to PATH for this session
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Accept licenses
log_info "Accepting Android SDK licenses..."
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses

# Install required packages
log_info "Installing SDK packages (platform-tools, emulator, platform $API_LEVEL, build-tools, system image)..."
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
    "platform-tools" \
    "emulator" \
    "platforms;android-${API_LEVEL}" \
    "build-tools;${API_LEVEL}.0.0" \
    "$SYSTEM_IMAGE"

# Create AVD
log_info "Creating AVD: $AVD_NAME"
if ! "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" list avd | grep -q "Name: $AVD_NAME"; then
    echo "no" | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
        -n "$AVD_NAME" \
        -k "$SYSTEM_IMAGE" \
        -d "$DEVICE_PROFILE" \
        --force
    log_info "AVD created successfully"
else
    log_info "AVD already exists"
fi

# Verify installation
log_info "Verifying installation..."
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --list_installed | grep -E "(platform-tools|emulator|platforms|build-tools|system-images)"

log_info "Setup complete!"
log_info ""
log_info "To start the emulator, run:"
log_info "  emulator -avd $AVD_NAME -no-snapshot-load &"
log_info ""
log_info "To wait for device:"
log_info "  adb wait-for-device"
log_info ""
log_info "Add to your shell profile (~/.bashrc, ~/.zshrc):"
log_info "  export ANDROID_HOME=\"$ANDROID_HOME\""
log_info "  export PATH=\"\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH\""