# Fetches the GitHub evidence for the Design Studio research and bench.
#
#   powershell -ExecutionPolicy Bypass -File scripts\fetch-design-evidence.ps1
#
# It reads the repository list from `docs/design/evidence/design-repos.txt`
# and writes a snapshot to `docs/design/evidence/github-repos-<date>.tsv`.
#
# The snapshot is the evidence: every star count, release tag, release date
# and licence in `docs/design/RESEARCH.md` and `docs/design/BENCH.md` comes
# from a row of that file, and the file says on which day it was read.
#
# The GitHub token is read at runtime by `scripts/gh.ps1` and is never
# printed, logged or written to the snapshot.
$ErrorActionPreference = "Stop"

$repoListPath = Join-Path $PSScriptRoot "..\docs\design\evidence\design-repos.txt"
$ghScript = Join-Path $PSScriptRoot "gh.ps1"
$today = (Get-Date).ToString("yyyy-MM-dd")
$outPath = Join-Path $PSScriptRoot "..\docs\design\evidence\github-repos-$today.tsv"

if (-not (Test-Path -LiteralPath $repoListPath)) {
    throw "No repository list at $repoListPath"
}
if (-not (Test-Path -LiteralPath $ghScript)) {
    throw "No GitHub wrapper at $ghScript"
}

$query = 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){nameWithOwner stargazerCount forkCount createdAt pushedAt isArchived isFork diskUsage licenseInfo{spdxId} latestRelease{tagName publishedAt} releases(last:1){totalCount nodes{tagName publishedAt isPrerelease}} defaultBranchRef{target{... on Commit{committedDate history(first:1){totalCount}}}} openIssues:issues(states:OPEN){totalCount}}}'

$rows = @()
$failed = @()

foreach ($line in Get-Content -LiteralPath $repoListPath) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
        continue
    }
    $parts = $trimmed -split "/"
    if ($parts.Count -ne 2) {
        throw "Bad repository line: $trimmed"
    }
    $owner = $parts[0]
    $name = $parts[1]

    # A repository that does not exist (or a renamed one) makes the CLI write
    # to stderr. That is a finding, not a crash: the row is recorded as failed
    # and the run continues.
    $ErrorActionPreference = "Continue"
    $raw = & powershell -ExecutionPolicy Bypass -File $ghScript api graphql `
        -F "owner=$owner" -F "name=$name" -f "query=$query" 2>&1 | Out-String
    $ErrorActionPreference = "Stop"

    try {
        $parsed = $raw | ConvertFrom-Json
    } catch {
        $failed += $trimmed
        continue
    }
    $repo = $parsed.data.repository
    if ($null -eq $repo) {
        $failed += $trimmed
        continue
    }

    $releaseTag = ""
    $releaseDate = ""
    $releaseTotal = 0
    $latestIsPrerelease = ""
    if ($null -ne $repo.latestRelease) {
        $releaseTag = $repo.latestRelease.tagName
        $releaseDate = $repo.latestRelease.publishedAt
    }
    if ($null -ne $repo.releases) {
        $releaseTotal = $repo.releases.totalCount
        if ($null -ne $repo.releases.nodes -and $repo.releases.nodes.Count -gt 0) {
            $latestIsPrerelease = $repo.releases.nodes[0].isPrerelease
        }
    }

    $licence = ""
    if ($null -ne $repo.licenseInfo) {
        $licence = $repo.licenseInfo.spdxId
    }

    $lastCommit = ""
    $commitTotal = 0
    if ($null -ne $repo.defaultBranchRef -and $null -ne $repo.defaultBranchRef.target) {
        $lastCommit = $repo.defaultBranchRef.target.committedDate
        $commitTotal = $repo.defaultBranchRef.target.history.totalCount
    }

    $rows += [pscustomobject]@{
        repo           = $repo.nameWithOwner
        url            = "https://github.com/$($repo.nameWithOwner)"
        stars          = $repo.stargazerCount
        forks          = $repo.forkCount
        created        = $repo.createdAt.Substring(0, 10)
        pushed         = $repo.pushedAt.Substring(0, 10)
        lastCommit     = $lastCommit.Substring(0, 10)
        commits        = $commitTotal
        licence        = $licence
        archived       = $repo.isArchived
        fork           = $repo.isFork
        releaseTag     = $releaseTag
        releaseDate    = $(if ($releaseDate -eq "") { "" } else { $releaseDate.Substring(0, 10) })
        releases       = $releaseTotal
        prerelease     = $latestIsPrerelease
        openIssues     = $repo.openIssues.totalCount
        diskKb         = $repo.diskUsage
    }
}

$rows = $rows | Sort-Object { $_.repo.ToLower() }
$rows | Export-Csv -LiteralPath $outPath -Delimiter "`t" -NoTypeInformation -Encoding utf8

Write-Output "Wrote $($rows.Count) repositories to $outPath"
if ($failed.Count -gt 0) {
    Write-Output "Failed: $($failed -join ', ')"
    exit 1
}
