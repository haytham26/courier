# Greps the source tree for banned patterns (FINAL_PROMPT §0-F.4, D21).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\grep-banned.ps1 [paths...]
$ErrorActionPreference = "Stop"
$patterns = @(
  "var\(--",
  "munim-maps",
  "expo-av",
  "expo-background-fetch",
  "PowerSync",
  "Supabase",
  "NativeWind",
  "gpt4free",
  "g4f",
  "python-jose",
  "passlib",
  "dev-secret",
  "dev-secret-change-in-production"
)
$paths = if ($args.Count -gt 0) { $args } else { @("apps", "packages", "services", "scripts", "db", "infra") }
$files = Get-ChildItem -Path $paths -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "node_modules|\\dist\\|\.turbo|\.expo|egg-info|\\build\\|\\\.venv\\|grep-banned\.ps1" }
$hits = Select-String -Path $files.FullName -Pattern $patterns -ErrorAction SilentlyContinue |
  ForEach-Object { "$($_.Path.Replace((Get-Location).Path + '\', '')):$($_.LineNumber): $($_.Line.Trim())" }
if ($hits) {
  $hits
  Write-Output "BANNED_HITS=$($hits.Count)"
  exit 1
}
Write-Output "BANNED_HITS=0"
exit 0
