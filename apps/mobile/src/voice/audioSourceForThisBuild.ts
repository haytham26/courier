/**
 * The audio source of THIS build for the on-device STT path (option C of the
 * audio-injection research, `docs/research/2026/voice-audio-injection.md`).
 *
 * It mirrors the other build-flag seams (`src/run/dayForThisBuild.ts`,
 * `src/scans/labelReader.ts`, `src/pod/podForThisBuild.ts`): the module
 * answers, for this build, whether an audio FILE may feed the recognizer and
 * from where, so the push-to-talk path can route the "microphone" to a WAV in
 * a TEST build - byte-deterministic input for the scale runs - while the live
 * path stays the only path a shipped build takes.
 *
 * The release guarantee is structural, and `audioSourceForThisBuild.test.ts`
 * pins it: a release build answers `never`. `__DEV__` is false in a shipped
 * artifact, and BUG-079's `check-e2e-flag.mjs` refuses both `EXPO_PUBLIC_E2E`
 * and `EXPO_PUBLIC_E2E_AUDIO_FILE` in a release variant, so neither flag is
 * ever inlined into the artifact a courier runs. `check-mock-reach.mjs` (the
 * A4 gate) lists this module as a seam, so the audio-file source behind it is
 * reachable only through here.
 *
 * The flags are read at CALL time (like the pod seam), so a test can flip them
 * per case.
 */
import { Paths } from 'expo-file-system';

import {
  AUDIO_FILE_INPUT_FLAG,
  audioFileInput,
  audioFileInputDefault,
} from './audioFileInput';

/** What this build answers for the recognizer's input. */
export type AudioSourceForThisBuild =
  | { kind: 'never' }
  | { kind: 'file'; path: string };

/** The build flavour the seam reads, injectable so a test can pose as one. */
export interface AudioSourceFlavour {
  /** `__DEV__` of the build: true in a debug build, false in a release one. */
  dev: boolean;
  /** Whether `EXPO_PUBLIC_E2E === '1'` was inlined (the E2E test artifact). */
  e2e: boolean;
  /** The raw `EXPO_PUBLIC_E2E_AUDIO_FILE` value, when the flag is inlined. */
  flag: string | undefined;
}

/**
 * The audio source of this build.
 *
 * A release build (`dev` false, `e2e` false) answers `never` whatever the
 * flag says. A test build answers the file the flag names; the E2E build
 * without the flag answers the runner-armed default file in the app's document
 * directory (`.maestro/run-all.sh` pushes it there before the flows run).
 */
export function audioSourceForThisBuild(
  flavour: AudioSourceFlavour = {
    dev: __DEV__,
    e2e: process.env.EXPO_PUBLIC_E2E === '1',
    flag: process.env[AUDIO_FILE_INPUT_FLAG],
  },
): AudioSourceForThisBuild {
  if (!flavour.dev && !flavour.e2e) {
    return { kind: 'never' };
  }
  // The document directory is handed over as a thunk and read only when a file
  // is resolved FROM it (a bare name in the flag, or the runner-armed
  // default): an absolute path in the flag never touches it, and a build with
  // no file armed never touches it either.
  const named = audioFileInput(flavour.flag, theDocumentDirectoryPath);
  if (named !== null) {
    return { kind: 'file', path: named.path };
  }
  if (flavour.e2e) {
    const armed = audioFileInputDefault(theDocumentDirectoryPath);
    return { kind: 'file', path: armed.path };
  }
  return { kind: 'never' };
}

/**
 * The app's own document directory as a plain path (no `file://` scheme).
 *
 * A static import, the way the pod seam reads `Paths` (`src/pod/
 * podForThisBuild.ts`); the thunk above keeps the READ lazy.
 */
function theDocumentDirectoryPath(): string {
  return Paths.document.uri.replace(/^file:\/\//, '').replace(/\/+$/, '');
}
