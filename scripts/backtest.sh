#!/bin/bash
# Backtest script - runs tests 50 times to verify stability
# Usage: ./scripts/backtest.sh

set -e

echo "========================================="
echo "COURIER COPILOT - BACKTEST 50x"
echo "========================================="

FAILED=0
PASSED=0

for i in {1..50}; do
    echo ""
    echo "--- Iteration $i/50 ---"
    
    if pnpm --filter shared test > /tmp/backtest_shared_$i.log 2>&1 && \
       pnpm --filter nz-address test > /tmp/backtest_nzaddress_$i.log 2>&1 && \
       pnpm --filter design-tokens test > /tmp/backtest_designtokens_$i.log 2>&1; then
        PASSED=$((PASSED + 1))
        echo "✓ Iteration $i PASSED"
    else
        FAILED=$((FAILED + 1))
        echo "✗ Iteration $i FAILED"
        echo "  Shared:"
        cat /tmp/backtest_shared_$i.log | tail -20
        echo "  NZ-Address:"
        cat /tmp/backtest_nzaddress_$i.log | tail -20
        echo "  Design-Tokens:"
        cat /tmp/backtest_designtokens_$i.log | tail -20
    fi
done

echo ""
echo "========================================="
echo "BACKTEST RESULTS: $PASSED passed, $FAILED failed"
echo "========================================="

if [ $FAILED -gt 0 ]; then
    echo "BACKTEST FAILED - $FAILED failures detected"
    exit 1
else
    echo "BACKTEST PASSED - All 50 iterations successful"
    exit 0
fi