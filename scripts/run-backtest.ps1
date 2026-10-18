$passed = 0
$failed = 0

for ($i = 1; $i -le 50; $i++) {
    Write-Host "--- Iteration $i/50 ---"
    
    Push-Location "C:\Users\DCL\projects\courier\packages\shared"
    & pnpm.cmd exec vitest run --reporter=basic 2>$null
    $sharedExit = $LASTEXITCODE
    Pop-Location
    
    Push-Location "C:\Users\DCL\projects\courier\packages\nz-address"
    & pnpm.cmd exec vitest run --reporter=basic 2>$null
    $nzAddressExit = $LASTEXITCODE
    Pop-Location
    
    Push-Location "C:\Users\DCL\projects\courier\packages\design-tokens"
    & pnpm.cmd exec vitest run --reporter=basic 2>$null
    $designTokensExit = $LASTEXITCODE
    Pop-Location
    
    if ($sharedExit -eq 0 -and $nzAddressExit -eq 0 -and $designTokensExit -eq 0) {
        $passed++
        Write-Host "Iteration $i PASSED"
    } else {
        $failed++
        Write-Host "Iteration $i FAILED"
    }
}

Write-Host "========================================="
Write-Host "BACKTEST RESULTS: $passed passed, $failed failed"
Write-Host "========================================="

if ($failed -gt 0) {
    Write-Host "BACKTEST FAILED"
    exit 1
} else {
    Write-Host "BACKTEST PASSED - All 50 iterations successful"
    exit 0
}