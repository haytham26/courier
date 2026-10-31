// The C1 audit's five high findings of the lead's own six squads, verified on
// origin/main and fixed at their roots - one contract each, proved red first.
//
//   node --test scripts/ci/__tests__/c1-workflow-contracts.test.mjs
//
// Each of these bugs is a workflow contract that nothing asserted, so each was
// invisible until it cost a run:
//   - BUG-094 (ci.yml): a cancelled run skipped the evidence upload, so the one
//     flaky failure that most needed diagnosing lost its artifacts.
//   - BUG-095 (release-apk.yml): the Collect step resolved `cp` against the
//     wrong working directory, so a release built red - and the release action's
//     files: path was a second mismatch of the same fact.
//   - BUG-097 (screen-recordings.yml + recordings-run.sh): an unhashed cache key
//     with no restore-keys, and a composition that only warned, so a green run
//     could carry blank reference images.
//   - BUG-098 (android-e2e.yml): the APK cache ran before the build with no hit
//     guard, so it saved nothing and a restored APK could be attached to a red.
//   - BUG-099 (check-store-readiness.mjs + the release path): the missing APK
//     was a WARN and no release workflow passed one, so the size budget and the
//     64-bit requirement were never enforced on the path that submits.
//
// The tests read the repo's own workflows as text (this repo's workflows are
// hand-written and aligned, and the parser is deliberately small - see
// check-workflows.test.mjs for the same convention).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** A workflow's text, so a key's presence and its neighbours can be asserted. */
function workflow(name) {
  return readFileSync(path.join(repoRoot, '.github', 'workflows', name), 'utf8');
}
/** A script's text, for the same reason. */
function script(name) {
  return readFileSync(path.join(repoRoot, name), 'utf8');
}
/** The lines of a text, trimmed of trailing space. */
const linesOf = (text) => text.split(/\r?\n/).map((line) => line.trimEnd());
/**
 * How many times the text says something.
 *
 * A contract is not "it appears somewhere": a second `always()` beside the one
 * that is meant to survive cancellation is the bug the audit named, so the count
 * has to be exactly one.
 */
function times(text, needle) {
  return text.split(needle).length - 1;
}

test('BUG-094: the ci evidence upload survives a cancelled run', () => {
  const text = workflow('ci.yml');
  assert.equal(
    times(text, 'if: always() || cancelled()'),
    1,
    'the evidence upload has to run on a cancellation, not only on a success',
  );
  assert.ok(
    /^\s{8}if: always\(\) \|\| cancelled\(\)$/m.test(text),
    'the conditional is on the evidence upload step and not anywhere else',
  );
});

test('BUG-095: the release collects its APK from where the build wrote it, and the release action reads it there', () => {
  const text = workflow('release-apk.yml');
  assert.equal(
    times(text, 'working-directory: apps/mobile/android'),
    1,
    'the Collect step runs where the build output is',
  );
  assert.match(
    text,
    /cp app\/build\/outputs\/apk\/(release|debug)\//,
    'the copy is relative to the android directory, as the build wrote it',
  );
  assert.match(
    text,
    /files: apps\/mobile\/android\/\$\{\{ steps\.apk\.outputs\.path \}\}/,
    "the release action resolves the artifact from the root, where the Collect step's artifact actually is",
  );
});

test('BUG-097: the recordings cache is content-hashed with a restore-keys, and a composition fails the job', () => {
  const text = workflow('screen-recordings.yml');
  assert.match(
    text,
    /key: playwright-\$\{\{ runner\.os \}\}-\$\{\{ hashFiles\('\*\*\/pnpm-lock\.yaml'\) \}\}-chromium-1\.49\.1/,
    "the Playwright cache key carries what determines the browser's bytes",
  );
  assert.match(
    text,
    /key: avd-\$\{\{ runner\.os \}\}-34-google-apis-x86_64-\$\{\{ steps\.pins\.outputs\.hash \}\}/,
    "the AVD cache key carries the same pins and options hash android-e2e.yml was given by BUG-068's fix",
  );
  // BUG-097's second half: a composition that fails is a failure of this job,
  // not a warning the summary can carry past. The keeper is the source of
  // truth for what the workflow does, so the contract is asserted there - and
  // it is the composition path that must set the status, not only the flow
  // failure (which the keeper already set before this fix).
  const keeper = script('.maestro/recordings-run.sh');
  assert.match(
    keeper,
    /composition failed for \$name"; status=1;/,
    'a failed composition sets the job status, rather than only warning',
  );
  assert.match(
    keeper,
    /echo "::error::no screencaps for \$name/,
    'a missing screencap is an error of the same job, not a warning',
  );
  assert.doesNotMatch(
    keeper,
    /::warning::composition failed/,
    'the warning-only form is the defect: it let a green run carry blank reference images',
  );
});

test('BUG-098: the APK cache is hit-guarded and the upload only attaches a run that can account for its APK', () => {
  const text = workflow('android-e2e.yml');
  assert.ok(/id: build-apk\b/.test(text), 'the build step is named, so the upload can name it');
  assert.equal(
    times(text, "if: steps.apk-cache.outputs.cache-hit != 'true'"),
    1,
    'a cache hit skips the build: that is what makes the cache save the private Actions minutes',
  );
  assert.match(
    text,
    /if: steps\.build-apk\.outcome == 'success' \|\| steps\.apk-cache\.outputs\.cache-hit == 'true'/,
    'the upload runs only when this run built the APK or the cache did: a restored APK under a red build is not an artifact of it',
  );
});

test('BUG-099: the release path measures the APK it submits, and an unmeasured artefact blocks it', () => {
  const release = workflow('release-apk.yml');
  assert.match(
    release,
    /check-store-readiness\.mjs[\s\S]{0,200}--apk[\s\S]{0,80}--release/,
    'the release workflow measures the very bytes it attaches, in release mode',
  );

  const readiness = script('scripts/ci/check-store-readiness.mjs');
  assert.match(
    readiness,
    /else if \(argument === '--release'\) options\.release = true;/,
    'the script accepts the release mode the workflows call it with',
  );
  assert.match(
    readiness,
    /requireApk \? 'BLOCKER' : 'WARN'/,
    'a missing artefact blocks the release path and warns anywhere else',
  );

  const storeReady = workflow('store-ready.yml');
  assert.match(storeReady, /--release/, 'the pre-submission lane feeds the same release mode');
});

test('the five contracts are all on the file they belong to, and no other leg of the same workflow is touched', () => {
  // The regression guard for the row's "consequence amended" notes: each fix
  // names one step of one workflow, and a second edit of the same shape would
  // be the bug again (this is how BUG-072's half landed once already).
  assert.equal(times(workflow('ci.yml'), 'name: Upload the evidence logs'), 1);
  assert.equal(times(workflow('release-apk.yml'), 'name: Collect the APK'), 1);
  assert.equal(times(workflow('android-e2e.yml'), 'name: Restore the APK from the cache'), 1);
  assert.equal(
    times(workflow('screen-recordings.yml'), 'name: Cache the Chromium of Playwright'),
    1,
  );
});
