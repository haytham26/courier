$passed = 38
$failed = 0
for ($i = 39; $i -le 50; $i++) {
    Write-Host "Iteration $i/50"
    Set-Location "C:\Users\DCL\projects\courier\packages\shared"
    & pnpm.cmd exec vitest run --reporter=basic 2>$null
    $e1 = $LASTEXITCODE
    Set-Location "C:\Users\DCL\projects\courier\packages\nz-address"
    & pnpm.cmd exec vitest run --reporter=basic 2>$null
    $e2 = $LASTEXITCODE
    Set-Location "C:\Users\DCL\projects\courier\packages\design-tokens"
    & pnpm.cmd exec vitest run --reporter=basic 2>$null
    $e3 = $LASTEXITCODE
    if ($e1 -eq 0 -and $e2 -eq 0 -and $e3 -eq 0) { $passed++; Write-Host "  PASSED" } else { $failed++; Write-Host "  FAILED" }
}
Write-Host "BACKTEST: $passed passed, $failed failed"
exit $failed