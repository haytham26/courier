/**
 * Shoots the eight screens of every direction of the round into PNG files.
 *
 *   node scripts/design/render-directions.mjs
 *
 * The output is `docs/design/directions-2/<n>-<name>/screenshots/<screen>-<theme>.png`,
 * 390 by 844, the size of the phone the screens are designed for. The
 * screenshots are taken from `render.html`, which is built by
 * `scripts/design/build-direction-renders.mjs` from the token package, so the
 * PNGs and the app cannot drift apart.
 *
 * The browser is the one on the machine: Chrome or Edge, headless. Set
 * `CHROME_PATH` to point at another one.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const directionsDir = join(repo, 'docs', 'design', 'directions-2');

/** The size of the phone the screens are designed for. */
const WIDTH = 390;
const HEIGHT = 844;

/** The frames of every direction, in the order of the spec. */
const FRAMES = [
  'today-light',
  'today-night',
  'driving-light',
  'driving-night',
  'copilot-light',
  'copilot-night',
  'scanner-light',
  'scanner-night',
];

/** Where a browser may live. */
const BROWSERS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter((path) => typeof path === 'string' && path.length > 0);

function findBrowser() {
  for (const candidate of BROWSERS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'no browser found for the render. Install Chrome or Edge, or set CHROME_PATH to the binary.',
  );
}

/**
 * The size of a PNG, read from the header of the file.
 *
 * The header of a PNG holds the width and the height as two 32-bit numbers
 * in big-endian order, so no image library is needed to check the render.
 */
function pngSize(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString('hex');

  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${path} is not a PNG`);
  }
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`${path} has no header`);
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** The size of the frame the browser was asked for. */
function shoot(browser, source, frame, target) {
  const url = `file:///${source.split('\\').join('/')}#${frame}`;

  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--virtual-time-budget=10000',
      `--screenshot=${target}`,
      url,
    ],
    { stdio: 'ignore' },
  );
}

const browser = findBrowser();
const failures = [];

for (const entry of readdirSync(directionsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  const folder = join(directionsDir, entry.name);
  const source = join(folder, 'render.html');

  if (!existsSync(source)) {
    continue;
  }

  const shots = join(folder, 'screenshots');
  mkdirSync(shots, { recursive: true });

  for (const frame of FRAMES) {
    const target = join(shots, `${frame}.png`);
    shoot(browser, source, frame, target);

    if (!existsSync(target)) {
      failures.push(`${entry.name}/${frame}: no PNG was written`);
      continue;
    }

    const size = pngSize(target);
    if (size.width !== WIDTH || size.height !== HEIGHT) {
      failures.push(`${entry.name}/${frame}: the PNG is ${size.width} by ${size.height}`);
      continue;
    }

    const bytes = statSync(target).size;
    if (bytes < 2000) {
      failures.push(`${entry.name}/${frame}: the PNG is ${bytes} bytes, the render is empty`);
      continue;
    }

    console.log(`${entry.name}/screenshots/${frame}.png  ${size.width}x${size.height}  ${bytes} bytes`);
  }
}

if (failures.length > 0) {
  console.error('FAILURES:');
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('Every frame was rendered.');
}
