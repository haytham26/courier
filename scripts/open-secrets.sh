#!/usr/bin/env bash
# open-secrets.sh
# Opens the .env.local file in the default editor for the founder to add keys.
# Run this when you need to update secrets.

set -euo pipefail

ENV_FILE="${1:-.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found. Creating from template..."
  if [[ -f ".env.example" ]]; then
    cp .env.example "$ENV_FILE"
  else
    echo "No .env.example found. Creating minimal .env.local..."
    cat > "$ENV_FILE" << 'EOF'
# Courier Copilot - Local Development Environment
# Add your keys here:

DATABASE_URL=postgresql://courier:courier@localhost:5432/courier
REDIS_URL=redis://localhost:6379
VALHALLA_URL=http://localhost:8002

APP_ENV=development
NODE_ENV=development
LOG_LEVEL=debug

# Add your keys here:
# LINZ_LDS_API_KEY=
# GROQ_API_KEY=
# etc.
EOF
  fi
fi

echo "🔓 Opening $ENV_FILE for editing..."

# Try various editors
if command -v code >/dev/null 2>&1; then
  code "$ENV_FILE"
elif command -v notepad >/dev/null 2>&1; then
  notepad "$ENV_FILE"
elif command -v vim >/dev/null 2>&1; then
  vim "$ENV_FILE"
elif command -v nano >/dev/null 2>&1; then
  nano "$ENV_FILE"
else
  echo "No editor found. Please edit $ENV_FILE manually."
  exit 1
fi

echo "✅ Done. Run 'pnpm check-secrets' to validate."