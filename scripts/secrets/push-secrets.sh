#!/usr/bin/env bash
# push-secrets.sh
# Pushes secrets from .env.local to GitHub repository secrets (for CI/CD).
# Requires: gh CLI authenticated with repo admin access, and GITHUB_TOKEN in .env.local

set -euo pipefail

ENV_FILE="${1:-.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found"
  exit 1
fi

# Check gh CLI
if ! command -v gh >/dev/null 2>&1; then
  echo "❌ GitHub CLI (gh) not installed. Install from https://cli.github.com/"
  exit 1
fi

# Check auth
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ Not authenticated with gh. Run 'gh auth login'"
  exit 1
fi

# Get repo from git remote
REPO=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:\/]//; s/\.git$//')
if [[ -z "$REPO" ]]; then
  echo "❌ Could not determine GitHub repo from git remote"
  exit 1
fi

echo "📤 Pushing secrets to $REPO..."

# List of secrets to push (only these go to GitHub)
SECRETS_TO_PUSH=(
  "DATABASE_URL"
  "REDIS_URL"
  "VALHALLA_URL"
  "LINZ_LDS_API_KEY"
  "LINZ_BASEMAPS_API_KEY"
  "CLOUDFLARE_ACCOUNT_ID"
  "CLOUDFLARE_API_TOKEN"
  "R2_ACCESS_KEY_ID"
  "R2_SECRET_ACCESS_KEY"
  "R2_BUCKET"
  "R2_ENDPOINT"
  "CF_WORKERS_AI_TOKEN"
  "OCI_HOST"
  "OCI_SSH_PRIVATE_KEY_PATH"
  "GROQ_API_KEY"
  "CEREBRAS_API_KEY"
  "GITHUB_TOKEN"
  "EXPO_TOKEN"
  "STRIPE_SECRET_KEY"
  "STRIPE_PUBLISHABLE_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "RESEND_API_KEY"
  "EMAIL_FROM"
  "POSTHOG_API_KEY"
  "POSTHOG_HOST"
  "GLITCHTIP_DSN"
  "APP_ENV"
  "NODE_ENV"
  "LOG_LEVEL"
)

# Load .env.local
set -a
source "$ENV_FILE"
set +a

for secret in "${SECRETS_TO_PUSH[@]}"; do
  value="${!secret:-}"
  if [[ -n "$value" && "$value" != "your_"*_here && "$value" != "sk_test_your_key" && "$value" != "pk_test_your_key" ]]; then
    echo "  Setting $secret..."
    gh secret set "$secret" --body "$value" --repo "$REPO" >/dev/null
  else
    echo "  Skipping $secret (empty or placeholder)"
  fi
done

echo "✅ Secrets pushed to GitHub"
echo "ℹ️  Note: GitHub Actions will use these for CI/CD"