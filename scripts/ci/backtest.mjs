#!/usr/bin/env node
// Backtest script - runs tests 50 times to verify stability

import { spawnSync } from 'child_process';

let passed = 0;
let failed = 0;

console.log("=========================================");
console.log("COURIER COPILOT - BACKTEST 50x");
console.log("=========================================");

for (let i = 1; i <= 50; i++) {
    console.log(`\n--- Iteration ${i}/50 ---`);
    
    const shared = spawnSync('pnpm', ['--filter', 'shared', 'test'], { cwd: 'C:/Users/DCL/projects/courier', stdio: 'pipe' });
    const nzAddress = spawnSync('pnpm', ['--filter', 'nz-address', 'test'], { cwd: 'C:/Users/DCL/projects/courier', stdio: 'pipe' });
    const designTokens = spawnSync('pnpm', ['--filter', 'design-tokens', 'test'], { cwd: 'C:/Users/DCL/projects/courier', stdio: 'pipe' });
    
    if (shared.status === 0 && nzAddress.status === 0 && designTokens.status === 0) {
        passed++;
        console.log(`✓ Iteration ${i} PASSED`);
    } else {
        failed++;
        console.log(`✗ Iteration ${i} FAILED`);
        if (shared.status !== 0 && shared.stdout) {
            console.log("  Shared:");
            console.log(shared.stdout.toString().slice(-1000));
        }
        if (shared.status !== 0 && shared.stderr) {
            console.log("  Shared stderr:");
            console.log(shared.stderr.toString().slice(-1000));
        }
        if (nzAddress.status !== 0 && nzAddress.stdout) {
            console.log("  NZ-Address:");
            console.log(nzAddress.stdout.toString().slice(-1000));
        }
        if (nzAddress.status !== 0 && nzAddress.stderr) {
            console.log("  NZ-Address stderr:");
            console.log(nzAddress.stderr.toString().slice(-1000));
        }
        if (designTokens.status !== 0 && designTokens.stdout) {
            console.log("  Design-Tokens:");
            console.log(designTokens.stdout.toString().slice(-1000));
        }
        if (designTokens.status !== 0 && designTokens.stderr) {
            console.log("  Design-Tokens stderr:");
            console.log(designTokens.stderr.toString().slice(-1000));
        }
    }
}

console.log("\n=========================================");
console.log(`BACKTEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=========================================");

if (failed > 0) {
    console.log("BACKTEST FAILED");
    process.exit(1);
} else {
    console.log("BACKTEST PASSED - All 50 iterations successful");
    process.exit(0);
}