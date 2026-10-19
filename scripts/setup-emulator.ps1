<# 
.SYNOPSIS
    Courier Copilot - Android SDK & Emulator Setup Script (Windows)
    Run with: powershell -ExecutionPolicy Bypass -File scripts\setup-emulator.ps1
    Or from elevated PowerShell: .\scripts\setup-emulator.ps1

.DESCRIPTION
    Sets up Android SDK, command-line tools, and emulator for Courier Copilot development.
    Requires Administrator privileges for winget installs.
#>

param(
    [string]$AndroidHome = "$env:USERPROFILE\Android\Sdk",
    [string]$ApiLevel = "35",
    [string]$AvdName = "courier_pixel",
    [string]$DeviceProfile = "pixel_8"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $colors = @{INFO = "Green"; WARN = "Yellow"; ERROR = "Red"}
    $color = $colors[$Level]
    Write-Host "[$Level] $Message" -ForegroundColor $color
}

function Check-Admin {
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Log "Setting up Android SDK for Courier Copilot on Windows..."
Write-Log "ANDROID_HOME: $AndroidHome"

# Check for admin rights
if (-not (Check-Admin)) {
    Write-Log "This script requires Administrator privileges for winget installs." -Level "WARN"
    Write-Log "Please run PowerShell as Administrator and re-run this script." -Level "WARN"
    Write-Log "Alternatively, you can manually install Android Studio and continue." -Level "WARN"
}

# Try winget install for Android Studio
try {
    Write-Log "Attempting to install Android Studio via winget..."
    winget install --id Google.AndroidStudio -e --accept-source-agreements --accept-package-agreements --silent
    Write-Log "Android Studio installed successfully"
} catch {
    Write-Log "winget install failed: $_" -Level "WARN"
    Write-Log "Falling back to command-line tools installation..." -Level "WARN"
}

# Also install OpenJDK 17 if not present
try {
    Write-Log "Checking for OpenJDK 17..."
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        Write-Log "Installing Microsoft OpenJDK 17..."
        winget install --id Microsoft.OpenJDK.17 -e --accept-source-agreements --accept-package-agreements --silent
    }
} catch {
    Write-Log "Java install failed or already present: $_" -Level "WARN"
}

# Set up command-line tools as fallback/alternative
$cmdlineDir = "$AndroidHome\cmdline-tools\latest"
$binDir = "$cmdlineDir\bin"

if (-not (Test-Path $binDir)) {
    Write-Log "Setting up Android command-line tools..."
    New-Item -ItemType Directory -Force -Path $cmdlineDir | Out-Null
    
    $zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $zipPath = "$AndroidHome\cmdline-tools.zip"
    
    Write-Log "Downloading command-line tools from $zipUrl..."
    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    } catch {
        Write-Log "Download failed: $_" -Level "ERROR"
        throw "Failed to download Android command-line tools"
    }
    
    # Wait for file to be released
    Start-Sleep -Seconds 10
    
    Write-Log "Extracting command-line tools..."
    try {
        Expand-Archive -Path $zipPath -DestinationPath $cmdlineDir -Force
        # The zip extracts to cmdline-tools/ so we need to move contents
        if (Test-Path "$cmdlineDir\cmdline-tools") {
            Move-Item -Path "$cmdlineDir\cmdline-tools\*" -Destination $cmdlineDir -Force
            Remove-Item -Path "$cmdlineDir\cmdline-tools" -Force -Recurse
        }
    } catch {
        Write-Log "Extraction failed: $_" -Level "ERROR"
        throw "Failed to extract command-line tools"
    }
    
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
} else {
    Write-Log "Command-line tools already present"
}

# Set environment variables for this session
$env:ANDROID_HOME = $AndroidHome
$env:PATH += ";$AndroidHome\platform-tools;$AndroidHome\emulator;$binDir"

# Accept licenses
Write-Log "Accepting Android SDK licenses..."
& "$binDir\sdkmanager.bat" --licenses | ForEach-Object { 
    if ($_ -like "*y/N*") { "y" } else { $_ } 
} | & "$binDir\sdkmanager.bat" --licenses

# Install required packages
Write-Log "Installing SDK packages..."
$packages = @(
    "platform-tools",
    "emulator", 
    "platforms;android-$ApiLevel",
    "build-tools;$ApiLevel.0.0",
    "system-images;android-$ApiLevel;google_apis_playstore;x86_64"
)

foreach ($pkg in $packages) {
    Write-Log "Installing $pkg..."
    & "$binDir\sdkmanager.bat" $pkg
}

# Create AVD
Write-Log "Creating AVD: $AvdName"
$avdExists = & "$binDir\avdmanager.bat" list avd | Select-String "Name: $AvdName"
if (-not $avdExists) {
    Write-Log "Creating new AVD..."
    echo "no" | & "$binDir\avdmanager.bat" create avd `
        -n $AvdName `
        -k "system-images;android-$ApiLevel;google_apis_playstore;x86_64" `
        -d $DeviceProfile `
        --force
    Write-Log "AVD created successfully"
} else {
    Write-Log "AVD already exists"
}

# Verify installation
Write-Log "Verifying installation..."
& "$binDir\sdkmanager.bat" --list_installed | Select-String -Pattern "(platform-tools|emulator|platforms|build-tools|system-images)"

Write-Log ""
Write-Log "Setup complete!" -Level "INFO"
Write-Log ""
Write-Log "To start the emulator, run:"
Write-Log "  emulator -avd $AvdName -no-snapshot-load"
Write-Log ""
Write-Log "To wait for device:"
Write-Log "  adb wait-for-device"
Write-Log ""
Write-Log "Add to your PowerShell profile (`$PROFILE):"
Write-Log "  `$env:ANDROID_HOME = '$AndroidHome'"
Write-Log "  `$env:PATH += `";$AndroidHome\platform-tools;$AndroidHome\emulator;$binDir`""
Write-Log ""
Write-Log "For microphone input in emulator:"
Write-Log "  Extended controls → Microphone → 'Virtual microphone uses host audio input'"
Write-Log ""
Write-Log "For location testing (GPX route for Christchurch):"
Write-Log "  Extended controls → Location → Load GPX from tests\fixtures\christchurch_route.gpx"