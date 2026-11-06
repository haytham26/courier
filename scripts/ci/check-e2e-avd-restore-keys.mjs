// The AVD restore gate (the 2026-11-05 audit's item 3e): only an EXACT cache
// key restores.
//
// `actions/cache` restores the newest cache whose key MATCHES when the exact
// key misses, for every `restore-keys` PREFIX given. A prefix that stops short
// of the pins' fingerprint - `avd-<os>-<api>-google-apis-x86_64-` - therefore
// hands the job an AVD built under a different Maestro version, emulator build,
// system-image revision or emulator-option set. That is BUG-068's failure
// re-armed (a 320x640 device profile whose flows failed their while `am start`
// answered green, so red gates got blamed on the app when the harness was what
// changed), one line below the comment that explains fixing it.
//
// This gate holds the line over the workflows that boot an emulator with the
// pins fingerprint:
//   node scripts/ci/check-e2e-avd-restore-keys.mjs
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-216';
const WORKFLOWS = ['android-e2e.yml', 'android-e2e-health.yml'];

/** A workflow's AVD cache block: the `key:` line and every `restore-keys` under it. */
function avdCache(file) {
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''));
  const cacheStart = lines.findIndex((line) => /Cache the AVD snapshot/.test(line));
  if (cacheStart === -1) return null;
  const withIndex = lines.findIndex((line, index) => index > cacheStart && /^\s*with:/.test(line));
  const key = lines.find((line, index) => index > withIndex && /^\s*key:/.test(line))?.trim() ?? '';
  const restores = lines
    .slice(withIndex + 1)
    .filter((line) => /^\s*restore-keys:/.test(line))
    .map((line) => line.trim());
  return { key, restores };
}

const problems = [];
for (const name of WORKFLOWS) {
  const cache = avdCache(`.github/workflows/${name}`);
  if (cache === null) {
    // A workflow that is not in the tree, or boots no emulator, has no AVD
    // cache - which is fine. The gate cannot go vacuous over a name that is
    // not there, so it says which files it read.
    continue;
  }
  if (!/steps\.pins\.outputs\.hash/.test(cache.key)) {
    problems.push(`${name}: the AVD cache key does not carry the pins fingerprint, so a pin change is not a cache miss`);
  }
  if (cache.restores.length > 0) {
    problems.push(
      `${name}: ${cache.restores.length} restore-keys prefix(es) restore an AVD whose pins do not match this job. ` +
        'Only an exact key restores (audit item 3e; BUG-068 is the failure this re-arms)',
    );
  }
}

if (problems.length > 0) {
  console.error(`the AVD restore rule is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const read = WORKFLOWS.filter((name) => avdCache(`.github/workflows/${name}`) !== null);
console.log(
  'check-e2e-avd-restore-keys: the AVD cache keys carry the pins fingerprint and only an EXACT key restores ' +
    `(${read.length > 0 ? read.join(' and ') + ' clean' : 'no AVD cache to read'})`,
);
