# The verifier pass over the evidence of `docs/design/RESEARCH-2.md`.
#
#   powershell -ExecutionPolicy Bypass -File scripts\verify-design-research2-evidence.ps1
#
# It re-reads a sample of the repositories in
# `docs/design/evidence/github-repos-research2-<date>.tsv` from the live GitHub
# API and compares the stars, the licence and the last release with the
# snapshot. The sample is every fifth row of the snapshot, so the sample grows
# with the pool and is always at least a fifth of it.
#
# It writes `docs/design/evidence/verifier-pass-<date>.tsv` and prints the
# corrections it forced.
$ErrorActionPreference = "Stop"

$snapshotPath = Join-Path $PSScriptRoot "..\docs\design\evidence\github-repos-research2-2026-10-22.tsv"
$ghScript = Join-Path $PSScriptRoot "gh.ps1"
$today = (Get-Date).ToString("yyyy-MM-dd")
$outPath = Join-Path $PSScriptRoot "..\docs\design\evidence\verifier-pass-$today.tsv"

if (-not (Test-Path -LiteralPath $snapshotPath)) {
    throw "No snapshot at $snapshotPath"
}

$query = 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){nameWithOwner stargazerCount licenseInfo{spdxId} latestRelease{tagName publishedAt} isArchived}}'

$snapshot = Import-Csv -LiteralPath $snapshotPath -Delimiter "`t"
$sample = @()
for ($i = 0; $i -lt $snapshot.Count; $i += 5) {
    $sample += $snapshot[$i]
}

$rows = @()
$corrections = @()
foreach ($repo in $sample) {
    $parts = $repo.repo -split "/"
    $owner = $parts[0]
    $name = $parts[1]

    $ErrorActionPreference = "Continue"
    $raw = & powershell -ExecutionPolicy Bypass -File $ghScript api graphql `
        -F "owner=$owner" -F "name=$name" -f "query=$query" 2>&1 | Out-String
    $ErrorActionPreference = "Stop"

    try {
        $parsed = $raw | ConvertFrom-Json
    } catch {
        $rows += [pscustomobject]@{
            repo      = $repo.repo
            checkedOn = $today
            result    = "unreadable"
            stars     = ""
            note      = "the API did not answer"
        }
        continue
    }
    $live = $parsed.data.repository
    if ($null -eq $live) {
        $rows += [pscustomobject]@{
            repo      = $repo.repo
            checkedOn = $today
            result    = "missing"
            stars     = ""
            note      = "the repository did not resolve"
        }
        $corrections += "$($repo.repo): no longer resolves"
        continue
    }

    $liveLicence = ""
    if ($null -ne $live.licenseInfo) {
        $liveLicence = $live.licenseInfo.spdxId
    }
    $liveTag = ""
    $liveDate = ""
    if ($null -ne $live.latestRelease) {
        $liveTag = $live.latestRelease.tagName
        $liveDate = $live.latestRelease.publishedAt
        if ($liveDate -ne "") {
            $liveDate = $liveDate.Substring(0, 10)
        }
    }

    $differences = @()
    $starDrift = [int]$live.stargazerCount - [int]$repo.stars
    if ([math]::Abs($starDrift) -gt 5) {
        $differences += "stars $($repo.stars) -> $($live.stargazerCount)"
    }
    if ($liveLicence -ne $repo.licence) {
        $differences += "licence $($repo.licence) -> $liveLicence"
    }
    if ($liveTag -ne $repo.releaseTag) {
        $differences += "release $($repo.releaseTag) -> $liveTag"
    }
    if ($liveDate -ne $repo.releaseDate) {
        $differences += "release date $($repo.releaseDate) -> $liveDate"
    }
    if ([string]$live.isArchived -ne [string]$repo.archived) {
        $differences += "archived $($repo.archived) -> $($live.isArchived)"
    }

    if ($differences.Count -eq 0) {
        $rows += [pscustomobject]@{
            repo      = $repo.repo
            checkedOn = $today
            result    = "confirmed"
            stars     = $live.stargazerCount
            note      = "stars, licence, release and archived flag unchanged"
        }
    } else {
        $rows += [pscustomobject]@{
            repo      = $repo.repo
            checkedOn = $today
            result    = "corrected"
            stars     = $live.stargazerCount
            note      = ($differences -join "; ")
        }
        $corrections += "$($repo.repo): $($differences -join '; ')"
    }
}

$rows | Export-Csv -LiteralPath $outPath -Delimiter "`t" -NoTypeInformation -Encoding utf8
$confirmed = @($rows | Where-Object { $_.result -eq "confirmed" }).Count
Write-Output "Verified $($rows.Count) of $($snapshot.Count) repositories (every fifth row) -> $outPath"
Write-Output "Confirmed: $confirmed; corrected: $(@($rows | Where-Object { $_.result -eq 'corrected' }).Count); unreadable: $(@($rows | Where-Object { $_.result -eq 'unreadable' }).Count)"
foreach ($correction in $corrections) {
    Write-Output "CORRECTION $correction"
}
