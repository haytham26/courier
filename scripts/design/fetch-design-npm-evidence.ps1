# Fetches the npm evidence for the Design Studio bench.
#
#   powershell -ExecutionPolicy Bypass -File scripts\fetch-design-npm-evidence.ps1
#
# It reads `docs/design/evidence/design-packages.txt` and writes
# `docs/design/evidence/npm-packages-<date>.tsv`.
#
# The size column is the unpacked size of the published tarball. It is a
# proxy for the install footprint, not the APK contribution: a package with
# native code also ships a `.so`/`.aar` that the tarball does not count.
$ErrorActionPreference = "Continue"

$packageListPath = Join-Path $PSScriptRoot "..\docs\design\evidence\design-packages.txt"
$today = (Get-Date).ToString("yyyy-MM-dd")
$outPath = Join-Path $PSScriptRoot "..\docs\design\evidence\npm-packages-$today.tsv"

if (-not (Test-Path -LiteralPath $packageListPath)) {
    throw "No package list at $packageListPath"
}

$rows = @()
$failed = @()

foreach ($line in Get-Content -LiteralPath $packageListPath) {
    $name = $line.Trim()
    if ($name -eq "" -or $name.StartsWith("#")) {
        continue
    }

    $raw = & npm view $name version dist.unpackedSize dist.fileCount license time.modified --json 2>$null | Out-String
    try {
        $parsed = $raw | ConvertFrom-Json
    } catch {
        $failed += $name
        continue
    }
    if ($null -eq $parsed -or $null -eq $parsed.version) {
        $failed += $name
        continue
    }

    $size = ""
    if ($null -ne $parsed.'dist.unpackedSize') {
        $size = [math]::Round($parsed.'dist.unpackedSize' / 1024)
    }
    $modified = ""
    if ($null -ne $parsed.'time.modified') {
        $modified = $parsed.'time.modified'.Substring(0, 10)
    }

    $rows += [pscustomobject]@{
        package     = $name
        version     = $parsed.version
        sizeKb      = $size
        licence     = $parsed.license
        published   = $modified
        registryUrl = "https://www.npmjs.com/package/$name"
    }
}

$rows | Export-Csv -LiteralPath $outPath -Delimiter "`t" -NoTypeInformation -Encoding utf8
Write-Output "Wrote $($rows.Count) packages to $outPath"
if ($failed.Count -gt 0) {
    Write-Output "Failed: $($failed -join ', ')"
}
