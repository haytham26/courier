// BUG-214 (the 2026-11-05 audit's item 3c): the deploy spelled its secrets into
// the ssh command line.
//
// `deploy.yml`'s deploy step used to interpolate
// `${{ secrets.COURIER_STAGING_DOMAIN }}` and `${{ secrets.COURIER_SMOKE_TOKEN }}`
// straight into the remote command:
//
//   ssh -i key "user@host" "cd /opt/courier/infra && bash smoke.sh \
//     --domain \"${{ secrets.COURIER_STAGING_DOMAIN }}\" --token \"${{ secrets.COURIER_SMOKE_TOKEN }}\""
//
// That is a secret in an ssh ARGV, which means it is readable in the remote
// host's own process list by any process on that host for as long as the command
// runs, and one quoting mistake is a leak into a log. The fix is what this gate
// holds:
//
//   1. NO secret is interpolated into the step's `run:` block at all - the
//      step's `env:` carries the secret names, which GitHub masks and which
//      never appear in a command line;
//   2. the two smoke secrets are piped to the remote shell over STDIN and read
//      into variables (`printf … | ssh … 'read -r domain && read -r token …'`),
//      and a failed read exits loudly instead of running a token-less test;
//   3. the step's run block parses as bash where bash exists.
//
//   node scripts/ci/check-deploy-secrets-inline.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-214';
const WORKFLOW = '.github/workflows/deploy.yml';
const STEP_NAME = 'Deploy to the host';
const STDIN_SECRETS = ['STAGING_DOMAIN', 'SMOKE_TOKEN'];

/**
 * The step the audit names, as its `env:` keys and its `run:` block.
 * The parser is deliberately small, like check-e2e-pins.mjs: this repo's YAML
 * is flat and hand-written, and a value it cannot read FAILS rather than being
 * waved through.
 */
export function readDeployStep(workflow) {
  // The workflow files are checked out with CRLF on Windows: a `\r` at the end
  // of a line is invisible to a reader and fatal to a regex anchored with `$`,
  // because `.` does not match a line terminator.
  const lines = workflow.split('\n').map((line) => line.replace(/\r$/, ''));
  const start = lines.findIndex((line) => line.trim() === `- name: ${STEP_NAME}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^      - name:/.test(lines[index])) {
      end = index;
      break;
    }
  }
  const block = lines.slice(start, end);
  const env = {};
  let inEnv = false;
  let run = null;
  let inRun = false;
  for (const line of block) {
    if (/^        env:/.test(line)) {
      inEnv = true;
      inRun = false;
      continue;
    }
    if (/^        run:/.test(line)) {
      inRun = true;
      inEnv = false;
      run = [];
      continue;
    }
    if (/^        [a-z]/.test(line)) {
      inEnv = false;
      inRun = false;
      continue;
    }
    if (inEnv) {
      const match = /^          ([A-Z_0-9]+):\s*(.*)$/.exec(line);
      if (match) env[match[1]] = match[2];
    }
    if (inRun) run.push(line.replace(/^          /, ''));
  }
  return { env, run: run === null ? '' : run.join('\n') };
}

const problems = [];
const workflow = readFileSync(WORKFLOW, 'utf8');
const step = readDeployStep(workflow);
if (!step) {
  console.error(`the deploy step named "${STEP_NAME}" was not found in ${WORKFLOW}`);
  process.exit(1);
}

const runLines = step.run.split('\n');
const runText = step.run;

// 1. No secret anywhere in the command lines.
const interpolated = runLines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => /secrets\./.test(line));
for (const { line, index } of interpolated) {
  problems.push(
    `run: line ${index + 1} interpolates a secret into a command line - readable in the host's own ` +
      `process list: ${line.trim().slice(0, 80)}`,
  );
}

// 2. The two smoke secrets travel through the environment and over stdin.
for (const name of STDIN_SECRETS) {
  if (!(name in step.env)) {
    problems.push(`the deploy step's env: does not carry ${name}: pass the secret through the environment, not the command`);
  }
}
// The INVOCATION line, not the first line that mentions smoke.sh: the step's
// comments talk about smoke.sh too, and a gate that matches a comment proves
// nothing about the command.
const smokeLine = runLines.find((line) => /bash smoke\.sh/.test(line));
if (smokeLine === undefined) {
  problems.push('the deploy step never invokes smoke.sh: there is no post-deploy proof at all');
} else if (
  !/printf[^|]*\|\s*ssh/.test(
    runLines
      .slice(0, runLines.indexOf(smokeLine) + 1)
      .join('\n')
      .replace(/\\\n/g, ' '),
  )
) {
  problems.push(
    'the smoke secrets are not piped into ssh over stdin: read them with a `printf … | ssh … ' +
      "'read -r …'\" shape, so no command line carries them",
  );
} else if (!/read -r domain/.test(smokeLine) || !/read -r token/.test(smokeLine)) {
  problems.push('the remote smoke invocation does not read the domain and the token from stdin');
} else if (!/'read -r domain/.test(smokeLine.replace(/\\\n/g, ' '))) {
  // The remote command's static half must be single-quoted, so the local shell
  // cannot expand anything inside it. The APP_VERSION prefix is the deliberate
  // exception: the sha is not a secret, and it is quoted so the remote
  // environment carries it.
  problems.push(
    "the remote smoke invocation does not start a single-quoted command: a read from stdin is only safe " +
      'when the static half of the remote command cannot be expanded by the local shell',
  );
} else if (/COURIER_STAGING_DOMAIN|COURIER_SMOKE_TOKEN/.test(smokeLine)) {
  problems.push('the smoke secret names appear on the smoke invocation line itself');
}

// 3. The run block parses as bash, where a working bash exists. A shell that is
//    present but broken (a Windows box whose WSL shim has no /bin/bash) is not
//    a parse failure, and saying so is not the same as passing.
const probe = spawnSync('bash', ['-n', '-s'], { input: 'true\n', encoding: 'utf8' });
const bashWorks = !probe.error && probe.status === 0 && probe.stderr === '';
if (!bashWorks) {
  console.log(
    'check-deploy-secrets-inline: a working bash is not on this machine, so the run block is asserted by ' +
      'shape here and parsed on the CI runner',
  );
} else {
  const parse = spawnSync('bash', ['-n', '-s'], { input: runText, encoding: 'utf8' });
  if (parse.status !== 0) {
    problems.push(`the deploy step's run block does not parse as bash: ${parse.stderr.trim().slice(0, 200)}`);
  }
}

if (problems.length > 0) {
  console.error(`the deploy's secret handling is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  'check-deploy-secrets-inline: no secret is spelled into the deploy\'s command lines; the domain and the ' +
    'smoke token travel through the environment and over stdin, read by the remote shell into variables',
);
