# Backtest script - runs tests 50 times to verify stability
# Usage: powershell -ExecutionPolicy Bypass -File scripts/backtest.ps1

Write-Host "========================================="
Write-Host "COURIER COPILOT - BACKTEST 50x"
Write-Host "========================================="

$FAILED = 0
$PASSED = 0

for ($i = 1; $i -le 50; $i++) {
    Write-Host ""
    Write-Host "--- Iteration $i/50 ---"
    
    $sharedResult = pnpm --filter shared test 2>&1 | Out-String
    $sharedExitCode = $LASTEXITCODE
    
    $nzAddressResult = pnpm --filter nz-address test 2>&1 | Out-String
    $nzAddressExitCode = $LASTEXITCODE
    
    $designTokensResult = pnpm --filter design-tokens test 2>&1 | Out-String
    $designTokensExitCode = $LASTEXITCODE
    
    if ($sharedExitCode -eq 0 -and $nzAddressExitCode -eq 0 -and $designTokensExitCode -eq 0) {
        $PASSED++
        Write-Host "✓ Iteration $i PASSED"
    } else {
        $FAILED++
        Write-Host "✗ Iteration $i FAILED"
        Write-Host "  Shared exit code: $sharedExitCode"
        Write-Host "  NZ-Address exit code: $nzAddressExitCode"
        Write-Host "  Design-Tokens exit code: $designTokensExitCode"
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "BACKTEST RESULTS: $PASSED passed, $FAILED failed"
Write-Host "========================================="

if ($FAILED -gt 0) {
    Write-Host "BACKTEST FAILED - $FAILED failures detected"
    exit 1
} else {
    Write-Host "BACKTEST PASSED - All 50 iterations successful"
    exit 0
}