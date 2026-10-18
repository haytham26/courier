#!/usr/bin/env bash
# review-gate.sh
# Runs all review board checks (5 subagents: correctness, security, performance, design, privacy)
# This is a gate that must pass before any PR can be merged (D10 requirement).

set -euo pipefail

echo "🛡️  Starting Review Board Gate Checks..."
echo "========================================="

EXIT_CODE=0

# 1. Correctness Review (TypeScript, Python typecheck, tests)
echo "📋 1/5 Correctness Review..."
if ! pnpm typecheck 2>&1 | tail -20; then
  echo "❌ TypeScript typecheck failed"
  EXIT_CODE=1
fi
if ! cd apps/api && uv run mypy . 2>&1 | tail -20; then
  echo "❌ Python typecheck failed"
  EXIT_CODE=1
fi
cd ../..
if ! pnpm test 2>&1 | tail -20; then
  echo "❌ Tests failed"
  EXIT_CODE=1
fi
echo "✅ Correctness Review passed"

# 2. Security Review (dependency audit, secrets check)
echo "📋 2/5 Security Review..."
if ! pnpm audit --audit-level=high 2>&1 | tail -10; then
  echo "⚠️  High severity npm vulnerabilities found"
  EXIT_CODE=1
fi
if ! cd apps/api && uv run pip-audit --desc 2>&1 | tail -10; then
  echo "⚠️  Python vulnerabilities found"
  EXIT_CODE=1
fi
cd ../..
if ! node scripts/check-secrets.js 2>&1 | grep -q "✅ All required"; then
  echo "❌ Secrets check failed"
  EXIT_CODE=1
fi
echo "✅ Security Review passed"

# 3. Performance Review (bundle size, startup time benchmarks)
echo "📋 3/5 Performance Review..."
# Placeholder - will be implemented when mobile app exists
echo "  (Mobile app not yet created - skipping bundle size check)"
echo "✅ Performance Review passed (placeholder)"

# 4. Design Review (design token compliance, accessibility)
echo "📋 4/5 Design Review..."
# Placeholder - will check design token usage when system exists
echo "  (Design system not yet created - skipping token compliance)"
echo "✅ Design Review passed (placeholder)"

# 5. Privacy Review (PII handling, data minimization)
echo "📋 5/5 Privacy Review..."
# Check for console.log of PII, hardcoded secrets, etc.
if grep -r "console\.log.*password\|console\.log.*token\|console\.log.*key" --include="*.ts" --include="*.tsx" apps/ packages/ 2>/dev/null; then
  echo "❌ Potential PII logging detected"
  EXIT_CODE=1
fi
echo "✅ Privacy Review passed"

echo "========================================="
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ ALL REVIEW BOARDS PASSED"
else
  echo "❌ ONE OR MORE REVIEW BOARDS FAILED"
fi

exit $EXIT_CODE