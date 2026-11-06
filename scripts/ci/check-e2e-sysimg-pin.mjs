// The system-image pin gate (the 2026-11-05 audit's item 3f).
//
// The emulator-runner action installs the system image from the stable channel
// by api-level, so the emulator's BYTES change whenever Google publishes a new
// revision of system-images;android-<api>;google_apis;x86_64 and nothing commits
// the change - the same class the Maestro and emulator pins fixed, and the
// reason the same APK was green on api-35 one hour and red on four PRs the next
// (BUG-065). This gate holds the pin the audit asked for:
//
//   1. a `SYSIMG_REV_<api>` value in the workflow's top-level env for every
//      api-level the e2e job runs;
//   2. the pins fingerprint READS that value (so a pin change is a cache miss
//      and a key change by construction);
//   3. a pre-step that resolves the newest $sdk/cmdline-tools/*/bin onto PATH
//      with a failing existence check that names the path (BUG-225: the
//      runner image does not put sdkmanager on PATH, so a bare `sdkmanager`
//      is "command not found"), then installs the image with three attempts,
//      wiping the image directory between them, and ASSERTS
//      Pkg.Revision == the pin;
//   4. a cache of the image keyed BY the revision;
//   5. the record step re-asserting the revision after the emulator ran, so the
//      action cannot quietly move it.
//
//   node scripts/ci/check-e2e-sysimg-pin.mjs
import { readFileSync } from 'node:fs';

const WORKFLOW = '.github/workflows/android-e2e.yml';

const problems = [];
const workflow = readFileSync(WORKFLOW, 'utf8');
const lines = workflow.split('\n').map((line) => line.replace(/\r$/, ''));

// --- the top-level env pins ------------------------------------------------
const envBlock = (() => {
  const start = lines.findIndex((line) => line === 'env:');
  if (start === -1) return [];
  const end = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() !== '' && !/^\s/.test(lines[index])) break;
    end.push(lines[index]);
  }
  return end;
})();
const pins = {};
for (const line of envBlock) {
  const match = /^\s+(SYSIMG_REV_\d+):\s*'?(\d+)'?\s*$/.exec(line);
  if (match) pins[match[1]] = match[2];
}
if (Object.keys(pins).length === 0) {
  problems.push(
    'the workflow has no SYSIMG_REV_<api> pin: the emulator image is installed from the stable channel ' +
      "by api-level, so its bytes change without a commit (BUG-065's class)",
  );
}
// The matrix's api-levels must all have a pin (a leg without one is the leg
// that floats). Both spellings: `api: [34, 35]` and a `- api: 34` list.
const matrixApis = [
  ...new Set(
    [
      ...[...workflow.matchAll(/^\s*-\s*api:\s*(\d+)\s*$/gm)].map((m) => m[1]),
      ...[...workflow.matchAll(/^\s*api:\s*\[([^\]]+)\]/gm)].flatMap((m) =>
        m[1].split(",").map((item) => item.trim()),
      ),
    ].filter(Boolean),
  ),
];
if (matrixApis.length === 0) {
  problems.push('the e2e job has no matrix api levels, so the pins have nothing to name');
}
for (const api of matrixApis) {
  if (!(`SYSIMG_REV_${api}` in pins)) {
    problems.push(`the matrix's api ${api} has no SYSIMG_REV_${api} pin: that leg's image floats`);
  }
}

// --- the fingerprint reads the pin ----------------------------------------
const fingerprint = (() => {
  const start = lines.findIndex((line) => /^\s*- name: The pins' fingerprint/.test(line));
  if (start === -1) return '';
  const end = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{6}- name:/.test(lines[index])) break;
    end.push(lines[index]);
  }
  return end.join('\n');
})();
if (!/rev_var="SYSIMG_REV_/.test(fingerprint)) {
  problems.push(
    'the pins fingerprint does not read SYSIMG_REV_<api> through a variable, so a pin change is not a key ' +
      'change (the fingerprint comment claiming it covers the image revision is the documentation lie the audit named)',
  );
}
if (!/\$\{!rev_var\}/.test(fingerprint)) {
  problems.push("the pins fingerprint does not interpolate the pin's value");
}

// --- the install pre-step: three attempts, a wipe, an assertion ------------
const install = (() => {
  const start = lines.findIndex((line) => /^\s*- name: .*[Pp]inned system image/.test(line) && /assert/.test(line));
  if (start === -1) return '';
  const end = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{6}- name:/.test(lines[index])) break;
    end.push(lines[index]);
  }
  return end.join('\n');
})();
if (install === '') {
  problems.push('the e2e job has no "Install the pinned system image" step with its revision assertion');
} else {
  if (!/until\s+sdkmanager\s+--install/.test(install) || /until\s+yes\s*\|/.test(install)) {
    problems.push(
      'the install pre-step does not run `sdkmanager --install` until it succeeds WITHOUT piping `yes` into it ' +
        '(BUG-227: under pipefail the SIGPIPE from `yes` reads as a failure, the wipe deletes the good install, ' +
        'and the loop retries until the budget runs out)',
    );
  }
  if (!/sdkmanager\s+--licenses/.test(install) || !/\|\|\s*true/.test(install)) {
    problems.push(
      'the install pre-step does not accept the SDK licenses once first (`yes | sdkmanager --licenses … || true`) ' +
        'before installing with stdin from /dev/null (BUG-227)',
    );
  }
  if (!/-ge\s*3/.test(install) || !/3\s*attempts/.test(install)) {
    problems.push('the install pre-step does not bound itself at three attempts');
  }
  if (!/rm -rf "\$dir"/.test(install)) {
    problems.push(
      'the install pre-step does not wipe the image directory between attempts: a half-unpacked image is ' +
        'what an install on top of one leaves behind',
    );
  }
  if (!/Pkg\.Revision/.test(install) || !/!= "\$want"/.test(install)) {
    problems.push("the install pre-step does not assert Pkg.Revision equals the pin");
  }
  // BUG-225: sdkmanager must be resolved from the SDK's cmdline-tools, not
  // called bare (the runner's PATH does not include it).
  if (!/cmdline-tools\/\*\/bin/.test(install)) {
    problems.push(
      'the install pre-step does not resolve $sdk/cmdline-tools/*/bin (BUG-225: the runner image does not ' +
        'put sdkmanager on PATH, so a bare `sdkmanager` is "command not found")',
    );
  }
  if (!/GITHUB_PATH/.test(install) || !/export PATH=/.test(install)) {
    problems.push(
      'the install pre-step does not put the resolved cmdline-tools bin onto PATH for this and later steps (BUG-225)',
    );
  }
  if (!/!\s*-x\s+"\$tools_bin\/sdkmanager"/.test(install) || !/::error::/.test(install)) {
    problems.push(
      'the install pre-step has no failing existence check that names the path when no ' +
        'cmdline-tools/sdkmanager exists under the SDK (BUG-225)',
    );
  }
}

// --- the image cache is keyed by the revision -----------------------------
const cacheKey = lines.find((line) => /^\s*key: sysimg-/.test(line)) ?? '';
if (cacheKey === '') {
  problems.push('there is no sysimg cache key: the pinned image is downloaded on every run');
} else if (!/steps\.pins\.outputs\.revision/.test(cacheKey)) {
  problems.push('the sysimg cache key is not keyed by the revision, so a revision change is not a cache miss');
}

// --- the record step re-asserts the pin ----------------------------------
const record = (() => {
  const start = lines.findIndex((line) => /^\s*- name: Record the pins this run actually used/.test(line));
  if (start === -1) return '';
  const end = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{6}- name:/.test(lines[index])) break;
    end.push(lines[index]);
  }
  return end.join('\n');
})();
if (!/Bump the pin in its own PR/.test(record)) {
  problems.push(
    'the record step only records the revision, it does not fail when the action moved it: a revision that ' +
      'changed under the pin is a number to record and forget',
  );
}

if (problems.length > 0) {
  console.error(`the system-image pin is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `check-e2e-sysimg-pin: the system image is pinned (SYSIMG_REV_ for ${Object.keys(pins).join(', ')}), the ` +
    'fingerprint reads the pin, the install asserts Pkg.Revision after three attempts, the cache is keyed ' +
    'by the revision, and the record step fails if the action moved it',
);
