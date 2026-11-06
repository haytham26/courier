// BUG-215 (the 2026-11-05 audit's item 3d): the deploy raced the gates.
//
// The deploy job used to run on `push: branches: [main]`, in parallel with the
// repository's own CI and Quality gates: a push fired the deploy before either
// workflow had a verdict, so the staging host could be served a tree that CI was
// about to call red. The audit's fix is `workflow_run`: the deploy starts when
// the gates CONCLUDE, on the sha they ran on, checked out by that sha rather
// than by the branch tip. The dispatch trigger stays, because a human may
// always ask.
//
// This gate holds all of it, in one file:
//
//   node scripts/ci/check-deploy-gate.mjs
import { readFileSync } from 'node:fs';

const WORKFLOW = '.github/workflows/deploy.yml';
const REQUIRED_GATES = ['CI', 'Quality gates'];

const problems = [];
const workflow = readFileSync(WORKFLOW, 'utf8');
const lines = workflow.split('\n').map((line) => line.replace(/\r$/, ''));

/** The block that starts at the given line: the lines after it until the first
 *  NON-EMPTY line at a lower indentation. A blank line inside a block does not
 *  end it - workflow files are full of blank lines inside run: blocks, and a
 *  reader that stops at one silently reads half a job. */
function blockAt(startIndex) {
  if (startIndex === -1) return '';
  const header = lines[startIndex];
  const indent = /^(\s*)/.exec(header)[1].length;
  const end = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() !== '' && /^\s*/.exec(line)[0].length <= indent) break;
    end.push(line);
  }
  return end.join('\n');
}

// --- the triggers ----------------------------------------------------------
const triggerBlock = blockAt(lines.findIndex((line) => /^on:/.test(line)));

if (!/workflow_run:/.test(triggerBlock)) {
  problems.push('the workflow has no workflow_run trigger: the deploy starts on a push, before the gates have a verdict');
}
for (const gate of REQUIRED_GATES) {
  if (!new RegExp(`workflows:\\s*\\[[^\\]]*"${gate}"`).test(triggerBlock)) {
    problems.push(`the workflow_run trigger does not name "${gate}": a deploy must wait for it by name`);
  }
}
if (!/types:\s*\[completed\]/.test(triggerBlock)) {
  problems.push('the workflow_run trigger does not react to [completed]: an in-flight gate would start the deploy');
}
if (!/workflow_dispatch:/.test(triggerBlock)) {
  problems.push('the workflow dropped workflow_dispatch: a human must always be able to ask for a deploy');
}
if (!/push:/.test(triggerBlock)) {
  problems.push('the workflow dropped the push trigger: the verify leg (the local VM) runs on every push on purpose');
}

// --- the deploy job --------------------------------------------------------
const deployBlock = blockAt(lines.findIndex((line) => /^  deploy:\s*$/.test(line)));
if (deployBlock.length === 0) {
  problems.push('the workflow has no deploy job at all');
} else {
  const jobIf = (/^\s*if:\s*(.+)$/m.exec(deployBlock) ?? [])[1] ?? '';
  if (!/workflow_run/.test(jobIf)) {
    problems.push(`the deploy job's if: (${jobIf.trim()}) does not run on workflow_run: the deploy cannot wait for the gates`);
  }
  if (/github\.ref == 'refs\/heads\/main'/.test(jobIf)) {
    problems.push(
      "the deploy job still runs on a push to main (github.ref == 'refs/heads/main'): a deploy on a push is a deploy " +
        'of a tree nobody has tested yet',
    );
  }
  if (/^\s*needs:\s*verify/m.test(deployBlock)) {
    problems.push(
      'the deploy job `needs: verify`, which runs on the push event only: on a workflow_run event the deploy would ' +
        'never run. The ordering guarantee is the gate step, not the job dependency',
    );
  }
  const checkout = (/\n\s*- uses: actions\/checkout@\S+.*\n(?:[ \t]+\S.*\n)*?[ \t]+ref:\s*([^\n]+?)\s*\n/.exec(deployBlock) ?? [])[1];
  if (!checkout || !/workflow_run\.head_sha/.test(checkout)) {
    problems.push(
      'the deploy job does not check out `github.event.workflow_run.head_sha`: the tip of the branch may have moved ' +
        'since the gates ran, and a deploy of the tip is a deploy of a tree nobody tested',
    );
  }
  // The gate step itself: it reads the runs and requires BOTH to be completed
  // and successful on the sha.
  const gateStep = (/name:\s*The gates are green on this sha\n([\s\S]*?)(?=\n      - name:|\n      - uses:|\Z)/.exec(deployBlock) ?? [])[1] ?? '';
  if (!/workflow_run\.head_sha/.test(gateStep)) {
    problems.push('the gate step does not read the sha the gates ran on');
  }
  for (const gate of REQUIRED_GATES) {
    if (!gateStep.includes(`"${gate}"`)) {
      problems.push(`the gate step does not require "${gate}": workflow_run fires for either workflow finishing`);
    }
  }
  if (!/==\s*"completed"/.test(gateStep) || !/==\s*"success"/.test(gateStep)) {
    problems.push('the gate step does not require a run to be both completed and successful');
  }
}

if (problems.length > 0) {
  console.error(`the deploy's gate is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `check-deploy-gate: the deploy runs on the gates' conclusion (${REQUIRED_GATES.join(' and ')}) and on a ` +
    'human dispatch, on the sha they ran on, and never on a push',
);
