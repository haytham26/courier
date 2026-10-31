#!/usr/bin/env node
/**
 * The issuer the API checks and the issuer the auth service signs with.
 *
 * BUG-122: the API reads `AUTH_JWT_ISSUER` from its own environment while the
 * auth service signs with `AUTH_JWT_ISSUER ?? BETTER_AUTH_URL`, and nothing in
 * the repo compared the two. They were wired by convention - the compose files
 * happened to pass the same expression to both - so a future edit that changed
 * one side would answer 401 for every correctly issued token, with a generic
 * detail and no diagnosis. This gate reads the compose files and refuses a tree
 * where the two sides do not come from one source.
 *
 * What it checks, over every `infra/compose*.yml`:
 *   1. the API's `AUTH_JWT_ISSUER` and the auth service's `AUTH_JWT_ISSUER`
 *      are the same expression;
 *   2. the auth service's `BETTER_AUTH_URL` and the API's `AUTH_JWT_ISSUER`
 *      resolve to the same value when the API's is an override with a default
 *      ( `${AUTH_JWT_ISSUER:-X}` against `X` ).
 *
 *   node scripts/ci/check-auth-issuer.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(here), '..', '..');
const infraDir = path.join(repoRoot, 'infra');

/**
 * The environment blocks of one compose file, as `{ [key]: value }`.
 *
 * A block is the lines indented under an `environment:` key, up to the next
 * key at the same indentation. Anchors (`<<: *x`) carry no keys of their own,
 * so each block is complete on its own.
 */
export function environmentBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;
  let depth = null;
  for (const line of lines) {
    const start = /^(\s*)environment:\s*$/.exec(line);
    if (start) {
      depth = start[1].length;
      current = {};
      blocks.push(current);
      continue;
    }
    const key = /^(\s*)([A-Z0-9_]+):\s*(.*)$/.exec(line);
    if (current && key && key[1].length > depth) {
      current[key[2]] = key[3].trim();
      continue;
    }
    if (current && key && key[1].length <= depth) {
      current = null;
    }
  }
  return blocks;
}

/** `${AUTH_JWT_ISSUER:-default}` as the default it carries, or null. */
function overrideDefault(value) {
  const match = /^\$\{([A-Z0-9_]+):-(.*)\}$/.exec(value);
  return match ? { name: match[1], fallback: match[2] } : null;
}

/** `https://${COURIER_DOMAIN:?a message}` as `https://${COURIER_DOMAIN}`. */
function withoutComposeMessage(value) {
  return value.replace(/\$\{([A-Z0-9_]+):\?[^}]*\}/g, '${$1}');
}

/**
 * Every finding in one compose file: each names the two values that disagree.
 */
export function findingsIn(file, text) {
  const blocks = environmentBlocks(text);
  const api = blocks.filter((block) => 'AUTH_JWT_ISSUER' in block && 'AUTH_JWKS_URL' in block);
  const auth = blocks.filter(
    (block) => 'AUTH_JWT_ISSUER' in block && 'BETTER_AUTH_SECRET' in block,
  );

  if (api.length === 0 && auth.length === 0) {
    return []; // a compose file that does not deploy the pair
  }
  if (api.length === 0 || auth.length === 0) {
    return [
      { file, kind: 'half', message: 'only one of the API and the auth service is configured' },
    ];
  }

  const apiIssuer = api[0].AUTH_JWT_ISSUER;
  const authIssuer = auth[0].AUTH_JWT_ISSUER;
  const authBaseUrl = withoutComposeMessage(auth[0].BETTER_AUTH_URL ?? '');
  const findings = [];

  if (apiIssuer !== authIssuer) {
    findings.push({
      file,
      kind: 'two-issuers',
      message: `the API checks ${apiIssuer} and the auth service signs ${authIssuer}`,
    });
    return findings;
  }

  // Both sides read the same expression. When it is an override, its default
  // has to be the auth service's own URL, because that is what the service
  // signs with when the override is not set.
  const resolved = overrideDefault(apiIssuer);
  if (resolved !== null && withoutComposeMessage(resolved.fallback) !== authBaseUrl) {
    findings.push({
      file,
      kind: 'issuer-vs-url',
      message: `${apiIssuer} defaults to ${resolved.fallback} and BETTER_AUTH_URL is ${auth[0].BETTER_AUTH_URL}`,
    });
  }
  return findings;
}

export function checkComposeFiles(dir) {
  const findings = [];
  let files = [];
  try {
    files = readdirSync(dir).filter((name) => /^compose.*\.ya?ml$/.test(name)).sort();
  } catch {
    return { findings: [{ file: dir, kind: 'missing', message: 'infra/ is not readable' }], files };
  }
  for (const name of files) {
    const file = path.join(dir, name);
    findings.push(...findingsIn(name, readFileSync(file, 'utf8')));
  }
  return { findings, files };
}

function main() {
  const { findings, files } = checkComposeFiles(infraDir);
  for (const finding of findings) {
    console.error(`${finding.file}: ${finding.message}`);
  }
  if (findings.length > 0) {
    console.error(
      `check-auth-issuer: the API and the auth service disagree about the issuer (BUG-122)`,
    );
    process.exit(1);
  }
  console.log(`check-auth-issuer: one issuer across ${files.length} compose files`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  main();
}
