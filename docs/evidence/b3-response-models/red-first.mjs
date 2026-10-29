// The red-first proof for the response_model slice: the new test, run against
// origin/main's code (no response_model on any handler), must fail.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const mainRepo = 'C:/Users/DCL/projects/courier-backend';
const worktree = 'C:/Users/DCL/projects/courier-backend/.worktrees/b1028c';
const venv = `${mainRepo}/services/api/.venv/Scripts/python.exe`;
const testFile = 'C:/Users/DCL/AppData/Local/Temp/opencode/test_response_models.py';

// Stash main's app tree over a scratch copy of the API package, then run the new
// test against it: the test must go red, which is the proof it proves something.
const scratch = mkdtempSync(path.join(tmpdir(), 'red-rm-'));
try {
  const { cpSync } = await import('node:fs');
  cpSync(`${mainRepo}/services/api`, path.join(scratch, 'api'), { recursive: true });
  cpSync(`${worktree}/services/api/tests/test_response_models.py`, path.join(scratch, 'api', 'tests', 'test_response_models.py'));
  // main's code, not the branch's: overwrite the branch's app sources.
  const branchApp = `${worktree}/services/api/app`;
  const mainApp = `${mainRepo}/services/api/app`;
  for (const entry of ['main.py', 'responses.py', 'auth/routes.py']) {
    try {
      cpSync(`${mainApp}/${entry}`, `${scratch}/api/app/${entry}`);
    } catch {
      // origin/main has no responses.py, which is the point: main's handlers
      // answer dicts, so the guard must go red over them.
      console.log(`main has no ${entry} (or could not copy): the pre-fix shape`);
    }
  }
  // If main has no responses.py at all, the branch's copy would mislead the run;
  // delete it so the test sees main's surface only.
  rmSync(path.join(scratch, 'api', 'app', 'responses.py'), { force: true });
  const out = execFileSync(venv, ['-m', 'pytest', 'tests/test_response_models.py', '-q'], {
    cwd: path.join(scratch, 'api'),
    encoding: 'utf8',
    env: { ...process.env, PYTHONPATH: path.join(scratch, 'api') },
  });
  console.log(out.trim());
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
