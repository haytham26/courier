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
 *      ( `${AUTH_JWT_ISSUER:-X}` against `X` );
 *   3. every API block's `AUTH_JWKS_URL` obeys the API's own boot rule
 *      (BUG-131, app/auth/jwks.py): a plaintext `http://` hop is allowed only
 *      from loopback or a host named in that block's `AUTH_JWKS_INTERNAL_HOSTS`
 *      (an override's default counts as the value). The a1 job's stack step
 *      ran exactly this failure on 2026-11-02: compose.ci.yml named `auth`
 *      as the JWKS host but never listed it, so the API container exited 1
 *      at import and no flow ran.
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

/** The loopback hosts the API's JWKS rule exempts (jwks.py's LOOPBACK_HOSTS). */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * The host list `AUTH_JWKS_INTERNAL_HOSTS` resolves to statically: a literal
 * list, or an override's default. `null` when the value is a bare `${VAR}`
 * the gate cannot resolve here - the API would resolve it from the
 * operator's env, so the gate stays silent rather than guess.
 */
function resolveHostList(value) {
  if (value === undefined) return [];
  const override = overrideDefault(value);
  if (override) value = override.fallback;
  if (/^\$\{/.test(value)) return null;
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The BUG-131 findings for one API environment block: the API refuses to
 * boot when its plaintext JWKS host is not listed on purpose, and the
 * container's exit-1 is the only place that refusal is visible - until this
 * gate reads the compose file and says it before the job runs.
 */
export function jwksFindings(file, block) {
  const url = block.AUTH_JWKS_URL;
  if (!url) return [];
  const parts = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)/i.exec(url);
  if (!parts) return []; // not absolute: the API's own validator names that at boot
  const scheme = parts[1].toLowerCase();
  const authority = parts[2];
  if (authority.includes('${')) return []; // depends on the operator's env
  const host = authority.split('@').pop().split(':')[0].toLowerCase();
  if (scheme === 'https' || LOOPBACK_HOSTS.has(host)) return [];
  const listed = resolveHostList(block.AUTH_JWKS_INTERNAL_HOSTS);
  if (listed === null || listed.includes(host)) return [];
  return [
    {
      file,
      kind: 'jwks-plaintext-host',
      message:
        `the API refuses to boot with AUTH_JWKS_URL ${url}: plaintext http and host ` +
        `'${host}' is not listed in AUTH_JWKS_INTERNAL_HOSTS (BUG-131) - the a1 stack's ` +
        `container would exit 1 at import`,
    },
  ];
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

  // BUG-131 applies to any block that configures the API's JWKS hop, pair or
  // no pair - compose.ci.yml deploys both, but a half-configured file still
  // has to boot.
  const findings = [];
  for (const block of blocks.filter((b) => 'AUTH_JWKS_URL' in b)) {
    findings.push(...jwksFindings(file, block));
  }

  if (api.length === 0 && auth.length === 0) {
    return findings; // a compose file that does not deploy the pair
  }
  if (api.length === 0 || auth.length === 0) {
    findings.push({
      file,
      kind: 'half',
      message: 'only one of the API and the auth service is configured',
    });
    return findings;
  }

  const apiIssuer = api[0].AUTH_JWT_ISSUER;
  const authIssuer = auth[0].AUTH_JWT_ISSUER;
  const authBaseUrl = withoutComposeMessage(auth[0].BETTER_AUTH_URL ?? '');

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
      `check-auth-issuer: a compose file breaks the API's boot rules (BUG-122 issuer, BUG-131 JWKS host)`,
    );
    process.exit(1);
  }
  console.log(
    `check-auth-issuer: one issuer and a listed JWKS host across ${files.length} compose files`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  main();
}
