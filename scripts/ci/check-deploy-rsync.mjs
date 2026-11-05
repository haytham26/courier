// BUG-212 (the 2026-11-05 audit's item 3a): the deploy's rsync flattened the
// tree and the very next command failed.
//
// `rsync -az --delete infra/ services/ packages/ host:/opt/courier/` with the
// TRAILING SLASHES copies the CONTENTS of each of the three flat into
// /opt/courier, so /opt/courier/api lands where /opt/courier/services/api
// belongs, --delete then removes whatever the host already had, and the next
// command - `cd /opt/courier/infra` - fails on a directory that never arrived.
// The audit named the fix (--relative, no trailing slashes) and asked for a
// proof against a scratch target directory. This is that proof, and it is a
// gate: the shape of the command in deploy.yml is asserted wherever it runs, and
// the two command shapes are run against a scratch tree - with the real rsync
// where it is installed (CI's ubuntu runner, any Linux or macOS developer
// machine), and against a simulation of rsync's documented semantics where it
// is not (a Windows shell). Both prove the same two layouts; only one of them
// proves rsync itself.
//
//   node scripts/ci/check-deploy-rsync.mjs
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WORKFLOW = '.github/workflows/deploy.yml';
const SOURCES = ['infra', 'services', 'packages'];

/** The workflow's COMMAND lines, comments stripped and continuations joined:
 *  the rsync spans two lines in deploy.yml (backslash continuation), and the
 *  workflow's own comments discuss the trailing slashes they replaced - a check
 *  that reads those as its input fails on its own documentation. */
function commandLines(workflow) {
  const raw = workflow
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  const joined = [];
  let current = '';
  for (const line of raw) {
    if (line.endsWith('\\')) {
      current += ` ${line.slice(0, -1).trim()}`;
    } else if (current) {
      joined.push(`${current} ${line}`.trim());
      current = '';
    } else {
      joined.push(line);
    }
  }
  if (current) joined.push(current.trim());
  return joined;
}

const problems = [];
const workflow = readFileSync(WORKFLOW, 'utf8');
const lines = commandLines(workflow).filter((line) => /\brsync\b/.test(line));

if (lines.length === 0) {
  problems.push(`${WORKFLOW} has no rsync line at all: the deploy copies nothing`);
}

// 1. The static shape: --relative, and the three sources WITHOUT trailing slashes.
const command = lines.join(' ');
if (!/(^|\s)--relative(\s|$)/.test(command)) {
  problems.push('the rsync has no --relative: the three folders are copied flat into the target');
}
for (const source of SOURCES) {
  if (!new RegExp(`(^|\\s)${source}(\\s|$)`).test(command)) {
    problems.push(`the rsync command does not name ${source}`);
  }
  if (new RegExp(`(^|\\s)${source}/`).test(command)) {
    problems.push(
      `the rsync names ${source}/ WITH a trailing slash: rsync copies the folder's CONTENTS, ` +
        `so /opt/courier/${source} never appears and the deploy's own \`cd /opt/courier/infra\` fails`,
    );
  }
}
// The deploy's own remote command must still find the tree it just sent.
if (!workflow.includes('cd /opt/courier/infra')) {
  problems.push('the deploy no longer cds /opt/courier/infra: this check guards that path');
}

/** A scratch source tree: the three folders, plus a nested path that only a
 *  relative copy reproduces (services/api/app). */
function scratchSource(dir) {
  for (const source of SOURCES) {
    mkdirSync(join(dir, source), { recursive: true });
    writeFileSync(join(dir, source, `${source}.md`), `${source} marker\n`, 'utf8');
  }
  mkdirSync(join(dir, 'services', 'api', 'app'), { recursive: true });
  writeFileSync(join(dir, 'services', 'api', 'app', 'main.py'), 'the api\n', 'utf8');
  return dir;
}

/** The layout the deploy step actually expects on the host. */
function assertHostLayout(target, label, sink) {
  for (const source of SOURCES) {
    if (!existsSync(join(target, source))) {
      sink?.push(`${label}: /opt/courier/${source} does not exist, so the deploy's own \`cd /opt/courier/infra\` fails`);
    }
  }
  if (!existsSync(join(target, 'services', 'api', 'app', 'main.py'))) {
    sink?.push(`${label}: services/api/app/main.py landed flat instead of under its own tree`);
  }
}

// 2. The two command shapes against a scratch tree.
const rsync = spawnSync('rsync', ['--version'], { encoding: 'utf8' });
const haveRsync = !rsync.error && rsync.status === 0;

/** rsync's two documented shapes, applied with node's own recursive copy:
 *  a source with a trailing slash contributes its CONTENTS; --relative
 *  contributes the folder itself. A simulation, and named as one. */
function simulate(source, target, relative) {
  mkdirSync(target, { recursive: true });
  for (const name of SOURCES) {
    if (relative) {
      cpSync(join(source, name), join(target, name), { recursive: true });
    } else {
      for (const entry of readdirSync(join(source, name), { withFileTypes: true })) {
        cpSync(join(source, name, entry.name), join(target, entry.name), { recursive: true });
      }
    }
  }
}

const root = mkdtempSync(join(tmpdir(), 'deploy-rsync-'));
try {
  const source = scratchSource(join(root, 'src'));
  const oldTarget = join(root, 'old-target');
  const newTarget = join(root, 'new-target');
  mkdirSync(oldTarget, { recursive: true });
  mkdirSync(newTarget, { recursive: true });

  if (haveRsync) {
    const run = (args, where) => {
      const answer = spawnSync('rsync', args, { cwd: source, encoding: 'utf8' });
      if (answer.error) throw answer.error;
      return answer;
    };
    // The OLD command, verbatim from the history this check replaces, and the
    // NEW one, verbatim from the workflow.
    run(['-az', '--delete', 'infra/', 'services/', 'packages/', `${oldTarget}/`], oldTarget);
    run(['-az', '--delete', '--relative', 'infra', 'services', 'packages', `${newTarget}/`], newTarget);
  } else {
    simulate(source, oldTarget, false);
    simulate(source, newTarget, true);
  }

  // The old command's damage, asserted rather than described: the top-level
  // infra folder is gone, and the nested path landed flat.
  const oldDamage = [];
  assertHostLayout(oldTarget, 'the old command (trailing slashes)', oldDamage);
  if (oldDamage.length === 0) {
    problems.push(
      'the old trailing-slash command produced a correct layout: either rsync changed the meaning of ' +
        'its own trailing slash or this proof no longer shows the bug it exists to show',
    );
  }
  // The new command's layout, asserted: the three folders keep their own level
  // and the nested path arrives whole.
  assertHostLayout(newTarget, 'the new command (--relative)', problems);
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`the deploy rsync check is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const proofKind = haveRsync
  ? 'the real rsync'
  : 'a simulation of the documented rsync semantics (rsync is not installed here)';
console.log(
  `check-deploy-rsync: --relative, the three sources without trailing slashes, and the scratch directory ` +
    `proves the tree the deploy cds into actually arrives (${proofKind})`,
);
