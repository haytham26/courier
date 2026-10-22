# Checks that every reference URL in the Design Studio research is real.
#
#   powershell -ExecutionPolicy Bypass -File scripts\check-design-reference-urls.ps1
#
# It reads `docs/design/evidence/reference-urls.txt`, fetches every URL and
# writes the HTTP status to
# `docs/design/evidence/reference-urls-<date>.tsv`. A link that is not in
# that file is not in `docs/design/RESEARCH.md`: no reference is a guess.
$ErrorActionPreference = "Continue"

$urlListPath = Join-Path $PSScriptRoot "..\docs\design\evidence\reference-urls.txt"
$today = (Get-Date).ToString("yyyy-MM-dd")
$outPath = Join-Path $PSScriptRoot "..\docs\design\evidence\reference-urls-$today.tsv"

if (-not (Test-Path -LiteralPath $urlListPath)) {
    throw "No URL list at $urlListPath"
}

$rows = @()
foreach ($line in Get-Content -LiteralPath $urlListPath) {
    $url = $line.Trim()
    if ($url -eq "" -or $url.StartsWith("#")) {
        continue
    }

    $status = "error"
    $note = ""
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -MaximumRedirection 5 -TimeoutSec 25 -UseBasicParsing -ErrorAction Stop
        $status = [string]$response.StatusCode
    } catch {
        $note = $_.Exception.Message
        try {
            $response = Invoke-WebRequest -Uri $url -Method Get -MaximumRedirection 5 -TimeoutSec 25 -UseBasicParsing -ErrorAction Stop
            $status = [string]$response.StatusCode
            $note = ""
        } catch {
            $note = $_.Exception.Message
        }
    }

    $rows += [pscustomobject]@{
        url    = $url
        status = $status
        note   = $note
        readOn = $today
    }
}

$rows | Export-Csv -LiteralPath $outPath -Delimiter "`t" -NoTypeInformation -Encoding utf8
Write-Output "Checked $($rows.Count) URLs -> $outPath"
foreach ($row in $rows) {
    Write-Output "$($row.status) $($row.url)"
}
