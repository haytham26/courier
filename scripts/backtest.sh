#!/usr/bin/env bash
# backtest.sh
# Runs the critical path tests 50 times to verify stability (D10 requirement).
# Exits with code 0 if all 50 runs pass, 1 if any fail.

set -euo pipefail

RUNS=50
PASSED=0
FAILED=0

echo "🧪 Starting 50x backtest for critical paths..."
echo "================================================"

for i in $(seq 1 $RUNS); do
  echo -n "Run $i/$RUNS: "
  
  # Run API tests
  if cd apps/api && uv run pytest tests/ -q --tb=no 2>/dev/null; then
    echo "✅ API tests passed"
  else
    echo "❌ API tests FAILED"
    FAILED=$((FAILED + 1))
    cd ../..
    continue
  fi
  cd ../..
  
  # Run shared package tests
  if cd packages/shared && pnpm test 2>/dev/null; then
    echo "  ✅ Shared tests passed"
  else
    echo "  ❌ Shared tests FAILED"
    FAILED=$((FAILED + 1))
    cd ../..
    continue
  fi
  cd ../..
  
  # Run nz-address package tests
  if cd packages/nz-address && pnpm test 2>/dev/null; then
    echo "  ✅ NZ Address tests passed"
  else
    echo "  ❌ NZ Address tests FAILED"
    FAILED=$((FAILED + 1))
    cd ../..
    continue
  fi
  cd ../..
  
  PASSED=$((PASSED + 1))
done

echo "================================================"
echo "📊 Results: $PASSED passed, $FAILED failed out of $RUNS runs"

if [[ $FAILED -gt 0 ]]; then
  echo "❌ BACKTEST FAILED - Critical path instability detected"
  exit 1
else
  echo "✅ BACKTEST PASSED - All $RUNS runs successful"
  exit 0
fi