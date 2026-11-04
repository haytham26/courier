#!/usr/bin/env node
/**
 * check-secrets.js
 * Validates that all required environment variables are set.
 * Exits with code 0 if all required vars present, 1 if missing.
 * Does NOT print secret values - only names.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'VALHALLA_URL',
  'APP_ENV',
  'NODE_ENV',
];

const OPTIONAL_VARS = [
  'LINZ_LDS_API_KEY',
  'LINZ_BASEMAPS_API_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
  'CF_WORKERS_AI_TOKEN',
  'OCI_HOST',
  'OCI_SSH_PRIVATE_KEY_PATH',
  'GROQ_API_KEY',
  'CEREBRAS_API_KEY',
  'GOOGLE_AI_STUDIO_API_KEY',
  'OPENROUTER_API_KEY',
  'GITHUB_TOKEN',
  'EXPO_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'POSTHOG_API_KEY',
  'POSTHOG_HOST',
  'GLITCHTIP_DSN',
];

/**
 * The repository's own .env.local, wherever the gate is called from.
 *
 * BUG-107: the path used to be built from `process.cwd()`, so a caller in a
 * subdirectory (a pnpm filter, a compose step, a squad's own script) read a
 * .env.local that was not there and the gate answered with an environment the
 * repository never declared. This script lives in scripts/ci/, two levels
 * under the root, so the root is reachable from the script itself.
 */
const REPO_ROOT = path.join(__dirname, '..', '..');

function loadEnvFile() {
  const envPath = path.join(REPO_ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...rest] = line.split('=');
        if (key && rest.length > 0 && !process.env[key.trim()]) {
          process.env[key.trim()] = rest.join('=').trim();
        }
      }
    });
  }
}

function checkSecrets() {
  loadEnvFile();
  
  console.log('Checking environment variables...\n');
  
  let missing = [];
  let present = [];
  
  console.log('REQUIRED:');
  for (const v of REQUIRED_VARS) {
    if (process.env[v]) {
      console.log('  OK ' + v);
      present.push(v);
    } else {
      console.log('  MISSING ' + v);
      missing.push(v);
    }
  }
  
  console.log('\nOPTIONAL (recommended for full functionality):');
  let optionalPresent = 0;
  for (const v of OPTIONAL_VARS) {
    if (process.env[v]) {
      console.log('  OK ' + v);
      optionalPresent++;
    } else {
      console.log('  NOT SET ' + v + ' (using local fallback)');
    }
  }
  
  console.log('\nSummary: ' + present.length + '/' + REQUIRED_VARS.length + ' required, ' + optionalPresent + '/' + OPTIONAL_VARS.length + ' optional');
  
  if (missing.length > 0) {
    console.log('\nMissing required variables. Please add them to .env.local');
    process.exit(1);
  } else {
    console.log('\nAll required environment variables are set!');
    process.exit(0);
  }
}

checkSecrets();