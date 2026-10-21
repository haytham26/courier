#!/usr/bin/env node
/**
 * The local pre-submission check for Google Play - the release manager's copy
 * of the CI gate (MASTER_EXECUTION section 15).
 *
 *   node scripts/check-store-readiness.mjs [--repo .] [--app apps/mobile] [--apk <file>] [--json <file>]
 *
 * StoreReady (github.com/MaTriXy/StoreReady) reads the project the way the
 * store sees it. This script reads the things a scanner cannot know: the
 * version and the version code, the permissions against the Play policy, the
 * 80 MB base APK budget, the 64-bit requirement, the target API level, the
 * privacy policy and the data safety notes, the icons, the signing
 * configuration, the version strings in the store listing draft and the
 * licence ledger.
 *
 * It prints a report and exits 1 when it finds a blocking problem. A missing
 * founder secret never fails it: the signing key lives in the GitHub Secrets
 * and this script only checks that the configuration reads it.
 */
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The Play facts this check enforces, with the source and the day it was read.
export const PLAY_POLICY = {
  requiredTargetApiLevel: 36,
  targetApiSource: 'https://support.google.com/googleplay/android-developer/answer/11926878',
  targetApiCheckedOn: '2026-10-22',
  apkBudgetBytes: 80 * 1024 * 1024,
  requiredAbis: ['arm64-v8a'],
  iconMinPixels: 512,
};

// The default target API level per Expo SDK (the Expo SDK reference and the
// expo-modules-autolinking Gradle plugin). The app can override it in app.json.
const EXPO_SDK_TARGET_API = { 54: 36, 55: 36, 56: 36, 57: 36, 58: 36 };

// The permissions Play only allows with a declaration, a video and a review.
const RESTRICTED_PERMISSIONS = [
  'QUERY_ALL_PACKAGES',
  'MANAGE_EXTERNAL_STORAGE',
  'READ_SMS',
  'RECEIVE_SMS',
  'READ_CALL_LOG',
  'WRITE_CALL_LOG',
  'REQUEST_INSTALL_PACKAGES',
  'SYSTEM_ALERT_WINDOW',
];

// The foreground service types the app needs: the route runs with the screen
// off and the voice agent listens while driving.
const REQUIRED_FOREGROUND_SERVICES = [
  'FOREGROUND_SERVICE_LOCATION',
  'FOREGROUND_SERVICE_MICROPHONE',
];

// The signing secrets the release workflow has to read. The names only: the
// values live in the GitHub Secrets and never in the repository.
const SIGNING_SECRETS = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
];

// The files that must never be in git.
const KEY_FILE_EXTENSIONS = ['.keystore', '.jks', '.p12', '.p8', '.pem', '.key', '.der'];

const SKIP_DIRECTORIES = new Set([
  '.git',
  '.expo',
  '.study',
  '.turbo',
  '.next',
  '.venv',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'Pods',
  'venv',
]);

const DOCUMENTS = [
  {
    id: 'privacy-policy',
    path: 'docs/operations/PRIVACY-POLICY.md',
    title: 'The privacy policy is missing',
    minLength: 400,
    fix: 'Write docs/operations/PRIVACY-POLICY.md and publish it at the URL the app shows.',
  },
  {
    id: 'data-safety',
    path: 'docs/operations/DATA-SAFETY.md',
    title: 'The data safety notes are missing',
    minLength: 200,
    fix: 'Write the Play Console data safety answers in docs/operations/DATA-SAFETY.md.',
  },
  {
    id: 'store-listing',
    path: 'docs/operations/STORE-LISTING.md',
    title: 'The store listing draft is missing',
    minLength: 200,
    fix: 'Write the store listing draft in docs/operations/STORE-LISTING.md.',
  },
  {
    id: 'permissions-declaration',
    path: 'docs/operations/PLAY-PERMISSIONS-DECLARATION.md',
    title: 'The background location declaration is missing',
    minLength: 200,
    fix: 'Write the declaration answers in docs/operations/PLAY-PERMISSIONS-DECLARATION.md.',
  },
];

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function readJson(path) {
  const text = readText(path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// The size of a PNG, from the IHDR header. The icon check needs it.
function pngSize(path) {
  let handle;
  try {
    handle = openSync(path, 'r');
    const head = Buffer.alloc(24);
    if (readSync(handle, head, 0, 24, 0) < 24) return null;
    if (head.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
    if (head.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } catch {
    return null;
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}

// The names in a zip, from the central directory. The APK check needs the
// native library folders to prove the build is 64-bit.
export function zipEntryNames(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 22) return null;

  const searchFrom = buffer.length - 22;
  const searchTo = Math.max(0, buffer.length - 66_000);
  let end = -1;
  for (let at = searchFrom; at >= searchTo; at -= 1) {
    if (buffer.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) return null;

  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const names = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > buffer.length) break;
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

function walkFiles(root, relativePath = '') {
  const found = [];
  const directory = join(root, relativePath);
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      found.push(...walkFiles(root, join(relativePath, entry.name)));
      continue;
    }
    found.push(join(relativePath, entry.name));
  }
  return found;
}

// The files git holds. A key in the working tree that git does not track (the
// generated Android folder, a study clone) is not a leak; a tracked key is.
function trackedFiles(repoDir) {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: repoDir,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.split('\0').filter((name) => name.length > 0);
  } catch {
    return null;
  }
}

function findKeyMaterial(repoDir) {
  const tracked = trackedFiles(repoDir);
  const files = tracked ?? walkFiles(repoDir);
  return files.filter((path) =>
    KEY_FILE_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension)),
  );
}

// The target API level the app ships with: the expo-build-properties plugin
// sets it, otherwise the app takes the default of its Expo SDK.
export function resolveTargetApiLevel(expoConfig, appDir) {
  const plugins = Array.isArray(expoConfig.plugins) ? expoConfig.plugins : [];
  for (const plugin of plugins) {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') continue;
    const options = plugin[1] ?? {};
    const level = options?.android?.targetSdkVersion;
    if (Number.isInteger(level)) return { level, source: 'the expo-build-properties plugin' };
  }

  const packageJson = readJson(join(appDir, 'package.json'));
  const expoVersion = packageJson?.dependencies?.expo ?? packageJson?.devDependencies?.expo;
  const major = Number.parseInt(String(expoVersion ?? '').replace(/^[^\d]*/, ''), 10);
  if (Number.isInteger(major) && EXPO_SDK_TARGET_API[major] !== undefined) {
    return { level: EXPO_SDK_TARGET_API[major], source: `the Expo SDK ${major} default` };
  }
  return null;
}

function megabytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// The paths in the report are always written with forward slashes.
function displayPath(path) {
  return path.split('\\').join('/');
}

/**
 * The check itself.
 *
 * @param {{repoDir?: string, appDir?: string, apkPath?: string|null, apkBudgetBytes?: number}} options
 */
export function checkStoreReadiness(options = {}) {
  const repoDir = resolve(options.repoDir ?? process.cwd());
  const appDir = options.appDir ? resolve(options.appDir) : join(repoDir, 'apps', 'mobile');
  const apkPath = options.apkPath ? resolve(options.apkPath) : null;
  const apkBudgetBytes = options.apkBudgetBytes ?? PLAY_POLICY.apkBudgetBytes;

  const findings = [];
  const add = (severity, id, title, detail, fix) => {
    findings.push({ id, severity, title, detail, fix });
  };

  const appJsonPath = join(appDir, 'app.json');
  const appJson = readJson(appJsonPath);
  if (appJson === null) {
    add(
      'BLOCKER',
      'app-config',
      'The app configuration is missing or is not valid JSON',
      `${displayPath(relative(repoDir, appJsonPath))} could not be read.`,
      'Fix the app configuration and run the check again.',
    );
    return summarise(findings);
  }

  const expoConfig = appJson.expo ?? {};
  const androidConfig = expoConfig.android ?? {};

  // The version and the build numbers.
  const version = typeof expoConfig.version === 'string' ? expoConfig.version.trim() : '';
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    add(
      'BLOCKER',
      'version',
      'The app version is missing or is not a version number',
      `${displayPath(relative(repoDir, appJsonPath))} has no valid expo.version.`,
      'Set "version" in the expo section of the app configuration.',
    );
  }

  const versionCode = androidConfig.versionCode;
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    add(
      'BLOCKER',
      'version-code',
      'The Android version code is not set',
      'Play needs a version code that goes up with every upload, and the app configuration has no "android": { "versionCode": n }.',
      'Add "versionCode" to the android section of the app configuration and raise it for every release.',
    );
  }

  const versionName =
    typeof androidConfig.version === 'string' && androidConfig.version.trim()
      ? androidConfig.version.trim()
      : version;

  // The permissions against the Play policy.
  const permissions = Array.isArray(androidConfig.permissions) ? androidConfig.permissions : [];
  const backgroundLocation = permissions.includes('ACCESS_BACKGROUND_LOCATION');

  for (const permission of RESTRICTED_PERMISSIONS) {
    if (permissions.includes(permission)) {
      add(
        'BLOCKER',
        `restricted-permission-${permission}`,
        `The manifest declares ${permission}`,
        'Play only allows this permission with a declaration, a video and a review, and it has no use in the app today.',
        `Remove ${permission} from the android permissions in the app configuration.`,
      );
    }
  }

  for (const service of REQUIRED_FOREGROUND_SERVICES) {
    if (!permissions.includes(service)) {
      add(
        'BLOCKER',
        `foreground-service-${service}`,
        `The manifest does not declare ${service}`,
        'The route runs with the screen off and the voice agent listens while driving, so the foreground service types have to be declared.',
        `Add ${service} to the android permissions in the app configuration.`,
      );
    }
  }

  if (!permissions.includes('FOREGROUND_SERVICE_DATA_SYNC')) {
    add(
      'WARN',
      'foreground-service-data-sync',
      'The manifest does not declare FOREGROUND_SERVICE_DATA_SYNC',
      'The app has no data sync foreground service today, so this is only a warning. It becomes a blocker when a long sync moves into the foreground.',
      'Declare FOREGROUND_SERVICE_DATA_SYNC when the sync engine runs as a foreground service.',
    );
  }

  // The in-app disclosure and the privacy policy link.
  const legalPath = join(appDir, 'src', 'constants', 'legal.ts');
  const legalText = readText(legalPath);
  if (legalText === null) {
    add(
      backgroundLocation ? 'BLOCKER' : 'WARN',
      'in-app-disclosure',
      'The in-app legal text is missing',
      `Play requires a prominent in-app disclosure for the background location permission. The app has no legal text file at ${displayPath(relative(repoDir, legalPath))}.`,
      'Add the legal text (the background location disclosure and the privacy policy URL) to the app and show the disclosure before the app asks for the location.',
    );
  } else {
    if (backgroundLocation && !/BACKGROUND_LOCATION_DISCLOSURE\s*=/.test(legalText)) {
      add(
        'BLOCKER',
        'in-app-disclosure',
        'The background location disclosure is missing from the in-app legal text',
        'The app declares the background location permission, so the disclosure has to be in the app.',
        'Add BACKGROUND_LOCATION_DISCLOSURE to the legal text and show it before the location permission request.',
      );
    }
    if (!/PRIVACY_POLICY_URL\s*=/.test(legalText)) {
      add(
        'BLOCKER',
        'privacy-policy-url',
        'The app has no privacy policy URL',
        'Play needs the privacy policy URL in the app as well as in the listing.',
        'Add PRIVACY_POLICY_URL to the legal text and link it from the settings.',
      );
    }
  }

  // The documents the store needs.
  for (const document of DOCUMENTS) {
    if (!backgroundLocation && document.id === 'permissions-declaration') continue;
    const text = readText(join(repoDir, document.path));
    if (text === null) {
      add('BLOCKER', document.id, document.title, `${document.path} does not exist.`, document.fix);
      continue;
    }
    if (text.trim().length < document.minLength) {
      add(
        'BLOCKER',
        document.id,
        `${document.title} (it is a stub)`,
        `${document.path} is only ${text.trim().length} characters long.`,
        document.fix,
      );
    }
  }

  // The version strings in the store listing draft.
  const listingPath = join(repoDir, 'docs/operations/STORE-LISTING.md');
  const listing = readText(listingPath);
  if (listing !== null) {
    const listedVersion = /^\s*[-*]?\s*App version:\s*(\S+)\s*$/m.exec(listing);
    const listedCode = /^\s*[-*]?\s*Version code:\s*(\d+)\s*$/m.exec(listing);
    if (listedVersion === null) {
      add(
        'BLOCKER',
        'store-listing-version',
        'The store listing has no app version',
        'The listing draft has no "App version:" line, so the listing cannot be compared with the app.',
        'Add the "App version" line to the store listing draft.',
      );
    } else if (listedVersion[1] !== version) {
      add(
        'BLOCKER',
        'store-listing-version',
        'The store listing version does not match the app',
        `The listing says ${listedVersion[1]} and the app says ${version}.`,
        'Make the store listing draft and the app configuration say the same version.',
      );
    }
    if (listedCode === null) {
      add(
        'BLOCKER',
        'store-listing-version-code',
        'The store listing has no version code',
        'The listing draft has no "Version code:" line, so the listing cannot be compared with the build.',
        'Add the "Version code" line to the store listing draft.',
      );
    } else if (versionCode !== undefined && Number(listedCode[1]) !== versionCode) {
      add(
        'BLOCKER',
        'store-listing-version-code',
        'The store listing version code does not match the app',
        `The listing says ${listedCode[1]} and the app says ${versionCode}.`,
        'Make the store listing draft and the app configuration say the same version code.',
      );
    }
    if (versionName && !listing.includes(versionName)) {
      add(
        'WARN',
        'store-listing-version-name',
        'The store listing does not mention the version name',
        `The app ships as ${versionName} and the listing draft does not say so.`,
        'Add the version name to the store listing draft.',
      );
    }
  }

  // The target API level.
  const targetApi = resolveTargetApiLevel(expoConfig, appDir);
  if (targetApi === null) {
    add(
      'WARN',
      'target-sdk',
      'The target API level could not be read',
      'Neither the expo-build-properties plugin nor the Expo SDK version says which API level the app targets.',
      'Set the target API level with the expo-build-properties plugin, so the check can read it.',
    );
  } else if (targetApi.level < PLAY_POLICY.requiredTargetApiLevel) {
    add(
      'BLOCKER',
      'target-sdk',
      `The app targets API level ${targetApi.level}, Play needs ${PLAY_POLICY.requiredTargetApiLevel}`,
      `Play requires new apps and app updates to target API level ${PLAY_POLICY.requiredTargetApiLevel} or higher (${PLAY_POLICY.targetApiSource}, read on ${PLAY_POLICY.targetApiCheckedOn}). The app takes ${targetApi.level} from ${targetApi.source}.`,
      'Raise the target API level to the level Play requires and run the check again.',
    );
  }

  // The icons.
  const iconPath = typeof expoConfig.icon === 'string' ? join(appDir, expoConfig.icon) : null;
  if (iconPath === null || !existsSync(iconPath)) {
    add(
      'BLOCKER',
      'icon',
      'The app icon is missing',
      `The app configuration points at ${expoConfig.icon ?? 'no icon'}, which does not exist.`,
      'Add the icon file and keep the path in the app configuration.',
    );
  } else {
    const size = pngSize(iconPath);
    if (size === null) {
      add(
        'BLOCKER',
        'icon',
        'The app icon is not a PNG',
        `${displayPath(relative(repoDir, iconPath))} is not a PNG file, so Play cannot read it.`,
        'Use a PNG icon with no transparency.',
      );
    } else if (size.width !== size.height || size.width < PLAY_POLICY.iconMinPixels) {
      add(
        'BLOCKER',
        'icon',
        'The app icon is not a square of at least 512 pixels',
        `The icon is ${size.width} by ${size.height} pixels. Play wants a square PNG of at least ${PLAY_POLICY.iconMinPixels} pixels.`,
        'Replace the icon with a square PNG of at least 512 pixels.',
      );
    }
  }

  const adaptiveIcon = androidConfig.adaptiveIcon ?? {};
  for (const key of ['foregroundImage', 'backgroundImage', 'monochromeImage']) {
    const value = adaptiveIcon[key];
    if (typeof value !== 'string' || value.length === 0) continue;
    if (!existsSync(join(appDir, value))) {
      add(
        'BLOCKER',
        `adaptive-icon-${key}`,
        `The adaptive icon image ${key} is missing`,
        `${value} does not exist, so the Android launcher icon cannot be built.`,
        'Add the image file and keep the path in the app configuration.',
      );
    }
  }

  // The signing: the configuration has to be there, the key must not be.
  const releaseWorkflowPath = join(repoDir, '.github/workflows/release-apk.yml');
  const releaseWorkflow = readText(releaseWorkflowPath);
  if (releaseWorkflow === null) {
    add(
      'BLOCKER',
      'signing-config',
      'The release workflow is missing',
      `${displayPath(relative(repoDir, releaseWorkflowPath))} does not exist, so nothing builds a signed release.`,
      'Write the release workflow so it builds the signed release artefact.',
    );
  } else {
    const missing = SIGNING_SECRETS.filter((name) => !releaseWorkflow.includes(name));
    if (missing.length > 0) {
      add(
        'BLOCKER',
        'signing-config',
        'The release workflow does not read the signing secrets',
        `The workflow does not mention ${missing.join(', ')}.`,
        'Read the signing secrets from the GitHub Secrets in the release workflow. The names only, the values never in the repository.',
      );
    }
  }

  const keyMaterial = findKeyMaterial(repoDir);
  if (keyMaterial.length > 0) {
    add(
      'BLOCKER',
      'signing-key',
      'A signing key is in the repository',
      `The repository holds ${keyMaterial.join(', ')}.`,
      'Take the file out of the repository and keep the key in the GitHub Secrets.',
    );
  }

  // The licence ledger.
  const ledgerPath = join(repoDir, 'docs/LICENSES.md');
  const ledger = readText(ledgerPath);
  if (ledger === null) {
    add(
      'BLOCKER',
      'licence-ledger',
      'The licence ledger is missing',
      `${displayPath(relative(repoDir, ledgerPath))} does not exist.`,
      'Run node scripts/check-licenses.mjs --write to write the ledger.',
    );
  } else {
    for (const name of ['expo', 'react-native', 'react']) {
      if (!ledger.includes(`| ${name} `)) {
        add(
          'BLOCKER',
          'licence-ledger',
          `The licence ledger does not list ${name}`,
          `${displayPath(relative(repoDir, ledgerPath))} has no row for ${name}.`,
          'Run node scripts/check-licenses.mjs --write to write the ledger.',
        );
      }
    }
    const unknown = (ledger.match(/\|\s*unknown\s*\|/g) ?? []).length;
    if (unknown > 0) {
      add(
        'WARN',
        'licence-ledger-unknown',
        `${unknown} packages have an unknown licence in the ledger`,
        'The ledger was written without the licence information.',
        'Run node scripts/check-licenses.mjs --write on a machine that can reach the npm registry.',
      );
    }
  }

  // The release artefact: the size budget and the 64-bit requirement.
  if (apkPath === null) {
    add(
      'WARN',
      'apk',
      'The release APK was not checked',
      'Without the release artefact the size budget and the 64-bit requirement cannot be measured.',
      'Run the check with --apk <the release APK> so the artefact is measured, not guessed.',
    );
  } else if (!existsSync(apkPath)) {
    add(
      'BLOCKER',
      'apk',
      'The release APK is missing',
      `${apkPath} does not exist.`,
      'Build the release artefact and run the check with --apk <the release APK>.',
    );
  } else {
    const size = statSync(apkPath).size;
    if (size > apkBudgetBytes) {
      add(
        'BLOCKER',
        'apk-size',
        `The base APK is ${megabytes(size)} MB, the budget is ${megabytes(apkBudgetBytes)} MB`,
        'The base APK has to stay inside the budget; the map pack and the voice pack ship as Play asset delivery, not inside the APK.',
        'Move the large assets out of the bundle and check the artefact again.',
      );
    }
    const names = zipEntryNames(apkPath);
    if (names === null) {
      add(
        'BLOCKER',
        'apk',
        'The release APK is not a readable package',
        `${apkPath} could not be read as a zip, so the 64-bit requirement cannot be checked.`,
        'Check the artefact that the release workflow produced.',
      );
    } else {
      const abis = new Set();
      for (const name of names) {
        const match = /^lib\/([^/]+)\//.exec(name);
        if (match) abis.add(match[1]);
      }
      const missingAbis = PLAY_POLICY.requiredAbis.filter((abi) => !abis.has(abi));
      if (missingAbis.length > 0) {
        add(
          'BLOCKER',
          'apk-64-bit',
          `The release APK has no ${missingAbis.join(' or ')} library`,
          `The native libraries in the APK are for ${[...abis].join(', ') || 'no ABI at all'}. Play only accepts 64-bit apps.`,
          'Build the release with the 64-bit ABIs and check the artefact again.',
        );
      }
    }
  }

  // The account deletion, which Play checks before it reviews anything.
  const accountDeletion = walkFiles(join(appDir, 'app')).some((path) =>
    /delete[-_]?account/i.test(path),
  );
  if (!accountDeletion) {
    add(
      'WARN',
      'account-deletion',
      'The app has no in-app account deletion',
      'Play asks for a way to delete the account from inside the app and a web link next to it.',
      'Add the account deletion screen and the web link before the first submission.',
    );
  }

  return summarise(findings);
}

function summarise(findings) {
  const blockers = findings.filter((finding) => finding.severity === 'BLOCKER');
  const warnings = findings.filter((finding) => finding.severity === 'WARN');
  return {
    findings,
    summary: {
      blockers: blockers.length,
      warnings: warnings.length,
      ready: blockers.length === 0,
    },
  };
}

/** The report the release manager reads. */
export function renderReport(result, options = {}) {
  const lines = [];
  const appDir = options.appDir ?? 'apps/mobile';
  lines.push(`Store readiness - the ${appDir} app`);
  lines.push(`Checked on ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');

  const blockers = result.findings.filter((finding) => finding.severity === 'BLOCKER');
  const warnings = result.findings.filter((finding) => finding.severity === 'WARN');

  if (blockers.length > 0) {
    lines.push(`BLOCKERS (${blockers.length})`);
    lines.push('');
    blockers.forEach((finding, index) => {
      lines.push(`  ${index + 1}. [${finding.id}] ${finding.title}`);
      lines.push(`     ${finding.detail}`);
      lines.push(`     Fix: ${finding.fix}`);
      lines.push('');
    });
  } else {
    lines.push('No blocking problems.');
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`WARNINGS (${warnings.length})`);
    lines.push('');
    warnings.forEach((finding, index) => {
      lines.push(`  ${index + 1}. [${finding.id}] ${finding.title}`);
      lines.push(`     ${finding.detail}`);
      lines.push(`     Fix: ${finding.fix}`);
      lines.push('');
    });
  } else {
    lines.push('No warnings.');
    lines.push('');
  }

  lines.push(
    result.summary.ready
      ? `${result.summary.blockers} blockers, ${result.summary.warnings} warnings - READY to submit`
      : `${result.summary.blockers} blockers, ${result.summary.warnings} warnings - NOT READY to submit`,
  );
  return lines.join('\n');
}

function parseArguments(argv) {
  const options = { repoDir: process.cwd(), appDir: null, apkPath: null, jsonPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      return argv[index];
    };
    if (argument === '--repo') options.repoDir = next() ?? options.repoDir;
    else if (argument === '--app') options.appDir = next() ?? options.appDir;
    else if (argument === '--apk') options.apkPath = next() ?? options.apkPath;
    else if (argument === '--json') options.jsonPath = next() ?? options.jsonPath;
    else if (argument === '--help' || argument === '-h') options.help = true;
  }
  return options;
}

function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    console.log(
      'Usage: node scripts/check-store-readiness.mjs [--repo <dir>] [--app <dir>] [--apk <file>] [--json <file>]',
    );
    return 0;
  }

  const repoDir = resolve(options.repoDir);
  const appDir = options.appDir ? resolve(options.appDir) : join(repoDir, 'apps', 'mobile');
  const result = checkStoreReadiness({
    repoDir,
    appDir,
    apkPath: options.apkPath,
  });

  console.log(renderReport(result, { appDir: displayPath(relative(repoDir, appDir)) }));

  if (options.jsonPath) {
    const report = {
      checkedOn: new Date().toISOString().slice(0, 10),
      app: displayPath(relative(repoDir, appDir)),
      apk: options.apkPath ? displayPath(relative(repoDir, resolve(options.apkPath))) : null,
      findings: result.findings,
      summary: result.summary,
    };
    writeReport(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`The machine report is in ${options.jsonPath}`);
  }

  return result.summary.ready ? 0 : 1;
}

function writeReport(path, content) {
  const directory = dirname(path);
  if (directory && !existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(path, content, 'utf8');
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`check-store-readiness: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 2;
  }
}
