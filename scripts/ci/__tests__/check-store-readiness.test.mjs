// The test for the local pre-submission check.
//
//   node --test scripts/ci/__tests__/check-store-readiness.test.mjs
//
// The check runs against a fixture app in a temporary folder: the good fixture
// has to pass, and the same fixture without the privacy policy has to fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-store-readiness.mjs');

const GOOD_APP_JSON = {
  expo: {
    name: 'Courier Copilot',
    slug: 'courier-copilot',
    version: '0.1.0',
    icon: './assets/icon.png',
    android: {
      package: 'com.courier.copilot',
      versionCode: 7,
      version: '0.1.0',
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'RECORD_AUDIO',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'FOREGROUND_SERVICE_MICROPHONE',
        'WAKE_LOCK',
      ],
    },
    plugins: [['expo-build-properties', { android: { targetSdkVersion: 36 } }]],
  },
};

const LEGAL_TS = `// The legal text the app shows before it asks for the location permission.
export const BACKGROUND_LOCATION_DISCLOSURE =
  'Courier Copilot tracks your route while you drive so the map and the stop list stay ' +
  'up to date, including with the screen off. The location stays on your phone.';
export const PRIVACY_POLICY_URL = 'https://courier.example/privacy';
`;

const PRIVACY_POLICY = `# Privacy policy

Courier Copilot collects the address, the time and the status of every delivery, the
location of the driver while a run is active, and the proof of delivery photo. The
data is stored in New Zealand and Australia. The driver can delete the run and the
account from the settings. The account data is deleted within 30 days of the request.

This draft covers the app the way it is built today. The founder and the lawyer have
to review the wording before the store listing goes live.
`;

const DATA_SAFETY = `# Data safety

The app collects the location, the personal info (name, email) and the photos. The
data is encrypted in transit, it is not sold and it is not shared for advertising. The
driver can ask for the data to be deleted and the account can be deleted in the app.
`;

const STORE_LISTING = `# Store listing draft

- App name: Courier Copilot
- App version: 0.1.0
- Version code: 7
- Short description: Voice-first delivery help for NZ couriers.
- Privacy policy URL: https://courier.example/privacy
`;

const PERMISSIONS_DECLARATION = `# Background location declaration

The app asks for the background location because the driver navigates with the screen
off and the map has to keep the route while the phone is in the pocket. The location
stays on the phone and the app shows the disclosure before it asks for the permission.

Play Console: App content, App access, Background location. The video shows the
driver starting a run, the map following the van and the permission request.
`;

const LICENCES = `# Licences

| Package | Licence |
|---------|---------|
| expo | MIT |
| react-native | MIT |
| react | MIT |
`;

const RELEASE_WORKFLOW = `name: Release APK
on:
  push:
    tags: ['v*']
jobs:
  apk:
    steps:
      - name: Read the signing secrets
        env:
          ANDROID_KEYSTORE_BASE64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: \${{ secrets.ANDROID_KEY_PASSWORD }}
        run: echo build
`;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

// A real PNG (the icon check reads the header), flat colour, so the fixture stays small.
function pngBytes(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    raw[row * (width * 4 + 1)] = 0; // the filter byte: none
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// A real zip (the APK check reads the central directory), stored, no compression.
function zipBytes(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    parts.push(local, nameBytes, data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuffer, end]);
}

function writeFile(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

// The fixture: a small repository that holds a good app. It lives in the
// system temp folder and only this test removes it.
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'courier-store-readiness-'));

  writeFile(root, 'apps/mobile/app.json', `${JSON.stringify(GOOD_APP_JSON, null, 2)}\n`);
  writeFile(
    root,
    'apps/mobile/package.json',
    `${JSON.stringify({ name: 'mobile', dependencies: { expo: '~58.0.14' } }, null, 2)}\n`,
  );
  writeFile(root, 'apps/mobile/src/constants/legal.ts', LEGAL_TS);
  writeFile(root, 'apps/mobile/assets/icon.png', pngBytes(512, 512));
  writeFile(root, 'apps/mobile/assets/android-icon-foreground.png', pngBytes(64, 64));
  writeFile(root, 'apps/mobile/assets/android-icon-background.png', pngBytes(64, 64));
  writeFile(root, 'apps/mobile/assets/android-icon-monochrome.png', pngBytes(64, 64));

  writeFile(root, 'docs/operations/PRIVACY-POLICY.md', PRIVACY_POLICY);
  writeFile(root, 'docs/operations/DATA-SAFETY.md', DATA_SAFETY);
  writeFile(root, 'docs/operations/STORE-LISTING.md', STORE_LISTING);
  writeFile(root, 'docs/operations/PLAY-PERMISSIONS-DECLARATION.md', PERMISSIONS_DECLARATION);
  writeFile(root, 'docs/product/LICENSES.md', LICENCES);
  writeFile(root, '.github/workflows/release-apk.yml', RELEASE_WORKFLOW);

  const apk = join(root, 'app-release.apk');
  writeFileSync(
    apk,
    zipBytes([
      ['AndroidManifest.xml', '<manifest package="com.courier.copilot" />'],
      ['lib/arm64-v8a/libexpo.so', 'arm64'],
      ['classes.dex', 'dex'],
    ]),
  );

  return { root, apk };
}

function runCheck(root, extra = []) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, '--repo', root, ...extra], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      code: error.status ?? 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    };
  }
}

test('a good app passes the local pre-submission check', () => {
  const { root, apk } = makeFixture();
  try {
    const result = runCheck(root, ['--apk', apk]);
    assert.equal(result.code, 0, `the check failed:\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /READY/);
    assert.doesNotMatch(result.stdout, /BLOCKERS \(\d+\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a missing privacy policy is a blocking problem', () => {
  const { root, apk } = makeFixture();
  try {
    rmSync(join(root, 'docs/operations/PRIVACY-POLICY.md'));
    const result = runCheck(root, ['--apk', apk]);
    assert.equal(result.code, 1, 'the check has to fail without the privacy policy');
    assert.match(result.stdout, /privacy policy/i);
    assert.match(result.stdout, /NOT READY/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the version strings in the store listing have to match the app', () => {
  const { root, apk } = makeFixture();
  try {
    const listing = readFileSync(join(root, 'docs/operations/STORE-LISTING.md'), 'utf8').replace(
      'Version code: 7',
      'Version code: 6',
    );
    writeFileSync(join(root, 'docs/operations/STORE-LISTING.md'), listing);
    const result = runCheck(root, ['--apk', apk]);
    assert.equal(result.code, 1);
    assert.match(result.stdout, /version code/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the release APK has to carry the 64-bit libraries', () => {
  const { root } = makeFixture();
  try {
    const apk = join(root, 'app-release.apk');
    writeFileSync(
      apk,
      zipBytes([
        ['AndroidManifest.xml', '<manifest package="com.courier.copilot" />'],
        ['lib/armeabi-v7a/libexpo.so', 'arm'],
      ]),
    );
    const result = runCheck(root, ['--apk', apk]);
    assert.equal(result.code, 1);
    assert.match(result.stdout, /64-bit/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the report is written to a file when the check asks for it', () => {
  const { root, apk } = makeFixture();
  try {
    const reportPath = join(root, 'report.json');
    const result = runCheck(root, ['--apk', apk, '--json', reportPath]);
    assert.equal(result.code, 0);
    assert.ok(existsSync(reportPath), 'the report file has to exist');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    assert.equal(report.summary.blockers, 0);
    assert.ok(Array.isArray(report.findings));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
