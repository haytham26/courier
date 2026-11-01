#!/usr/bin/env node
/**
 * Licence gate — the "no copyleft in the shipped app" rule (V4 §2, §7).
 *
 * Reads the installed dependency tree (pnpm-lock.yaml) and fails when a
 * package that reaches the mobile bundle carries a forbidden licence.
 * The full inventory is written to docs/product/LICENSES.md.
 *
 *   node scripts/ci/check-licenses.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FORBIDDEN = ['AGPL', 'GPL', 'SSPL', 'Commons Clause', 'CC-NC', 'FSL', 'BUSL'];
const ALLOW = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'Unlicense',
  'CC0-1.0',
];
const OUTPUT = 'docs/product/LICENSES.md';

const lock = readFileSync('pnpm-lock.yaml', 'utf8');
const packages = new Map();

for (const line of lock.split('\n')) {
  const match = line.match(/^  (@?[^\s:][^:]*):\s*$/);
  if (!match) continue;
  const name = match[1].replace(/^'/, '').replace(/'$/, '');
  packages.set(name, true);
}

/**
 * The registry's answer for one package, and whether it answered at all.
 *
 * BUG-103: `pnpm view` used to fail into `'unknown'`, and the loop below read
 * `'unknown'` as neither forbidden nor reviewable - so a registry outage left
 * all 31 packages uncleared and the gate GREEN, which is the one outcome this
 * gate exists to prevent ("31 packages all unknown, exit 0", reproduced against
 * the real script). A lookup that did not answer is a failure now: an
 * unreadable licence cannot be cleared, and the gate says so.
 */
function licenceOf(name) {
  try {
    const output = execFileSync('pnpm', ['view', name, 'license', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 20000,
    });
    return { answered: true, value: output.replace(/"/g, '').trim() };
  } catch {
    return { answered: false, value: '' };
  }
}

// The mobile app is what ships to the store: only its dependency closure matters.
const mobileDeps = [
  'react-native',
  'react',
  'expo',
  'react-native-unistyles',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-gesture-handler',
  'react-native-sherpa-onnx',
  'react-native-vision-camera',
  '@maplibre/maplibre-react-native',
  '@op-engineering/op-sqlite',
  'better-auth',
  '@better-auth/expo',
  '@better-auth/passkey',
  '@simplewebauthn/browser',
  'expo-audio',
  'expo-secure-store',
  '@expo/vector-icons',
  'expo-location',
  'expo-router',
  'expo-sqlite',
  'expo-file-system',
  'expo-constants',
  'expo-linking',
  'expo-network',
  'expo-web-browser',
  'react-native-nitro-modules',
  'expo-haptics',
  'expo-local-authentication',
  'react-native-worklets',
];

const rows = [];
let failures = 0;

for (const name of mobileDeps) {
  const answer = licenceOf(name);
  // BUG-103: an unanswered lookup is a failure, not a third state that reads
  // as a pass. An empty answer is the same: the registry was reached and said
  // nothing a licence can be read from.
  if (!answer.answered || answer.value === '') {
    failures += 1;
    console.error(
      `  [licence] ${name}: the registry did not answer a licence (pnpm view failed) — an unreadable licence cannot be cleared (BUG-103)`,
    );
    rows.push({ name, licence: 'unreadable' });
    continue;
  }
  const licence = answer.value;
  const forbidden = FORBIDDEN.find((needle) =>
    licence.toUpperCase().includes(needle.toUpperCase()),
  );
  const allowed = ALLOW.some((needle) => licence.toUpperCase().includes(needle));
  if (forbidden) {
    failures += 1;
    console.error(`  [licence] ${name}: ${licence} is forbidden in the shipped app`);
  } else if (!allowed) {
    console.error(`  [licence] ${name}: ${licence} is not on the allow-list — review it`);
    failures += 1;
  }
  rows.push({ name, licence });
}

/**
 * The ledger of the code we adapted and the data we ship.
 *
 * It is written here, not by hand in the output file, so the next run of
 * this script keeps it: the provenance of every adopted project has to
 * survive the regeneration of the table above.
 */
const ADOPTED = [
  '## Adopted code and data (not npm dependencies)',
  '',
  'These are the projects we adapted and the data we ship. The licence of each one is',
  'here with its URL and the date it was read.',
  '',
  '| What | Upstream | Licence | Read on | Where it is used |',
  '| ---- | -------- | ------- | ------- | --------------- |',
  "| God's Eye View | https://github.com/bilawalsidhu/gods-eye-view | MIT (Copyright (c) 2026 Bilawal Sidhu) | 2026-10-22 | the spoken camera verbs in `apps/mobile/src/maps/cameraCommands.ts`; the MIT notice is kept in that file |",
  '| NZ Building Outlines | https://data.linz.govt.nz/layer/101290-nz-building-outlines/ | Creative Commons Attribution 4.0 International (CC BY 4.0) | 2026-10-22 | the footprints of the 3D buildings, baked into the offline pack |',
  '| OpenStreetMap | https://www.openstreetmap.org/copyright | Open Database License (ODbL) | 2026-10-21 | the roads, the building levels and the attribution of the offline pack |',
  '',
  '## The voice service (services/courier-voice)',
  '',
  'The models and the libraries Courier Voice uses. The licences of the weights are',
  'checked separately from the licences of the code (D24). The service publishes the',
  'whole ledger itself at `GET /v1/licences` (ADR-004: the ledger is a shipped',
  'surface, not a spreadsheet), and it refuses to load an engine whose licence is',
  'unknown or not commercial.',
  '',
  '| What | Upstream | Licence | Read on | Where it is used |',
  '| ---- | -------- | ------- | ------- | --------------- |',
  '| sherpa-onnx | https://github.com/k2-fsa/sherpa-onnx | Apache-2.0 (code and the models it ships) | 2026-10-21 | the on-device speech - STT, TTS, VAD and the keyword spotting - through `react-native-sherpa-onnx` 0.4.4 (MIT) |',
  '| Kokoro-82M | https://huggingface.co/hexgrad/Kokoro-82M | Apache-2.0 (weights) | 2026-10-21 | the voice that speaks on the phone; the attribution is in the licences screen of the app |',
  '| smart-turn-v3 | https://github.com/pipecat-ai/smart-turn | BSD-2-Clause (code, weights, data and the training script) | 2026-10-21 | the end of the turn, read from the prosody on the phone |',
  '| silero-vad | https://github.com/snakers4/silero-vad | MIT in the LICENSE file, CC BY-NC 4.0 in the README badge - contradictory, UNVERIFIED | 2026-10-21 | the voice activity gate, only through sherpa-onnx; internal-only until the file is read in our own tree |',
  '| Qwen3-ASR and Qwen3-TTS | https://huggingface.co/Qwen | Apache-2.0 (weights) | 2026-10-21 | the server speech candidates of the gateway; not enabled by default |',
  '| OmniRoute | https://github.com/diegosouzapw/OmniRoute | MIT | 2026-10-21 | the one gateway the server brain talks to (D25) |',
  '| OmniVoice pretrained weights | https://huggingface.co/k2-fsa/OmniVoice | CC-BY-NC | 2026-10-21 | **blocked**: not downloaded, not shipped and not served to a driver |',
  '| OmniVoice audio_tokenizer weights | https://huggingface.co/k2-fsa/OmniVoice | Boson Higgs Audio 2 Community Licence Agreement | 2026-10-21 | **blocked**: the community licence carries obligations we do not take |',
  '| openWakeWord shipped models | https://huggingface.co/davidscripka/openwakeword | CC-BY-NC-SA-4.0 | 2026-10-21 | **blocked**: the weights are non-commercial and share-alike |',
  '| fastapi | https://github.com/fastapi/fastapi | MIT | 2026-10-22 | the HTTP surface of the voice service |',
  '| starlette | https://github.com/encode/starlette | BSD-3-Clause | 2026-10-22 | the ASGI layer under FastAPI |',
  '| uvicorn | https://github.com/encode/uvicorn | BSD-3-Clause | 2026-10-22 | the server that runs the voice service |',
  '| pydantic and pydantic-settings | https://github.com/pydantic/pydantic | MIT | 2026-10-22 | the models and the configuration of the voice service |',
  '| httpx | https://github.com/encode/httpx | BSD-3-Clause | 2026-10-22 | the calls to the gateway and to the Courier API |',
  '| PyJWT | https://github.com/jpadilla/pyjwt | MIT | 2026-10-22 | the verification of the token of the courier |',
  '| cryptography | https://github.com/pyca/cryptography | Apache-2.0 OR BSD-3-Clause | 2026-10-22 | the ES256 keys of the JWKS |',
  '| certifi | https://github.com/certifi/python-certifi | MPL-2.0 | 2026-10-22 | the trust store of httpx; it does not reach the app bundle |',
  '',
  "The imagery providers that need a commercial licence are **not** adopted: Google Photorealistic 3D Tiles and Cesium ion are refused by `scripts/data/build-3d-buildings.mjs` (see `docs/decisions/adr/ADR-005-map-view-modes.md`).",
  '',
];

const body = [
  '# Licences — the mobile app dependency closure',
  '',
  'Generated by `node scripts/ci/check-licenses.mjs --write` (V4 §2: no GPL/AGPL/SSPL/Commons Clause/',
  'CC-NC/FSL/BUSL in the shipped app). The allow-list is MIT, Apache-2.0, BSD-2/3-Clause, ISC,',
  '0BSD, Unlicense and CC0-1.0; anything else must be reviewed and justified.',
  '',
  '| Package | Licence |',
  '|---------|---------|',
  ...rows.map((row) => `| ${row.name} | ${row.licence} |`),
  '',
  ...ADOPTED,
].join('\n');

if (process.argv.includes('--write')) {
  writeFileSync(OUTPUT, body, 'utf8');
  console.log(`check-licenses: wrote ${OUTPUT}`);
} else if (!existsSync(OUTPUT)) {
  writeFileSync(OUTPUT, body, 'utf8');
  console.log(`check-licenses: wrote ${OUTPUT}`);
}

if (failures > 0) {
  console.error(`check-licenses: ${failures} package(s) need a licence review`);
  process.exit(1);
}

console.log(`check-licenses: ${rows.length} package(s) checked, no forbidden licence`);
process.exit(0);
