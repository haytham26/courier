// The deploy verify leg must install the workspace's dependencies BEFORE
// anything calls `infra/deploy.sh apply` (BUG-070).
//
// The auth service's migration runs on the CI runner: `npx auth migrate` reads
// `services/auth/src/migrate.config.ts`, which imports `./config.js` ->
// `src/config.ts`, which imports `zod` from the service's own node_modules. A
// GitHub runner checks out the tree with **no** node_modules, so the import
// dies with a raw `MODULE_NOT_FOUND` — main red on every push for a cause
// nobody could read. The deploy job's own skip for the missing OCI secrets is
// correct and stays; this gate is what keeps the verify leg from being the
// difference between green and red.
//
//   node scripts/ci/check-deploy-verify-installs.mjs [path-to-deploy.yml]
//
// With no argument it reads the repository's own workflow, so it is a gate.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-070';
const INSTALL_STEP = 'Install the workspace';
const INSTALL_COMMAND = 'pnpm install --frozen-lockfile';
const DEPLOY_CALL = 'infra/deploy.sh apply';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const defaultDeployWorkflow = path.join(repoRoot, '.github', 'workflows', 'deploy.yml');

/**
 * The ordering reasons a deploy workflow's verify leg is wrong.
 * @param {string} text the workflow file
 * @returns {string[]} empty when the leg is right
 */
export function checkDeployWorkflow(text) {
  const failures = [];
  const verifyStart = text.indexOf('  verify:');
  const deployStart = text.indexOf('\n  deploy:');
  if (verifyStart === -1) {
    return ['this is not a workflow with a verify job'];
  }
  const verify = text.slice(verifyStart, deployStart === -1 ? text.length : deployStart);

  const installIndex = verify.indexOf(INSTALL_STEP);
  const applyIndex = verify.indexOf(DEPLOY_CALL);
  if (installIndex === -1) {
    failures.push(`the verify leg has no step named "${INSTALL_STEP}": the workspace's dependencies are never installed`);
  }
  if (applyIndex === -1) {
    failures.push(`the verify leg never calls ${DEPLOY_CALL}: is this the deploy workflow?`);
  }
  if (installIndex !== -1 && applyIndex !== -1 && installIndex > applyIndex) {
    failures.push(`the "${INSTALL_STEP}" step comes AFTER ${DEPLOY_CALL} is called: the auth migration would still fail`);
  }
  if (installIndex !== -1 && !verify.slice(installIndex, installIndex + 400).includes(INSTALL_COMMAND)) {
    failures.push(`the "${INSTALL_STEP}" step does not run ${INSTALL_COMMAND}`);
  }
  return failures;
}

export function readDeployWorkflow(file) {
  return readFileSync(file, 'utf8');
}

const main = () => {
  const target = path.resolve(process.argv[2] ?? defaultDeployWorkflow);
  const failures = checkDeployWorkflow(readDeployWorkflow(target));
  if (failures.length > 0) {
    console.error(`${BUG_ID} (${target}):`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`${BUG_ID}: the deploy verify leg installs the workspace before it deploys`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
