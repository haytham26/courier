// Metro configuration for the mobile app inside a pnpm monorepo.
//
// The app imports the workspace package `@courier/design-tokens` (a symlink
// outside the app folder). Without the workspace root in `watchFolders` and in
// `nodeModulesPaths`, Metro cannot resolve it and the release bundle fails
// with "Unable to resolve module @courier/design-tokens/themes".
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// The whole workspace is watched: a change in a shared package must rebuild.
config.watchFolders = [workspaceRoot];

// pnpm keeps the packages in the store: both node_modules trees are searched.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// The package exports map is the single source of truth for the subpaths.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
