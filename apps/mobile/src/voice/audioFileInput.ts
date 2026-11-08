/**
 * The audio-file source of a TEST build (option C of the audio-injection
 * research, `docs/research/2026/voice-audio-injection.md`): this module owns
 * WHICH audio file may feed the on-device recognizer, and where it is read
 * from.
 *
 * Audit item A4's rule applies to this module the way it applies to the mock
 * stop list: `scripts/ci/check-mock-reach.mjs` guards its name, so the only
 * import of it in the app is the build-flag seam
 * (`audioSourceForThisBuild.ts`). A screen that imported this module directly
 * would be a screen that can feed the recognizer from outside the seam - the
 * gate names it as an offender.
 *
 * The build flag `EXPO_PUBLIC_E2E_AUDIO_FILE` names the file: an absolute path
 * (or a `file://` URI) is taken as it is, a bare name is read from the app's
 * own document directory (the private dir the E2E runner pushes the fixture
 * into). BUG-079's `check-e2e-flag.mjs` refuses the flag in a release variant,
 * so a release build never inlines it.
 */

/** The build flag that names the test audio file. */
export const AUDIO_FILE_INPUT_FLAG = 'EXPO_PUBLIC_E2E_AUDIO_FILE';

/**
 * The file the E2E runner arms when the flag is not set:
 * `.maestro/run-all.sh` pushes the fixture WAV under this name into the app's
 * document directory before the flows run.
 */
export const DEFAULT_AUDIO_FILE_INPUT_NAME = 'e2e-utterance.wav';

/** What the flag named, resolved to a path the recognizer can read. */
export interface AudioFileInput {
  path: string;
}

/**
 * The document directory, as the seam hands it over: a plain value, or a thunk
 * the source calls only when it actually resolves a file from the directory
 * (so a build that answers no file never reads it).
 */
export type DocumentDirectory = string | (() => string);

/** The app's document directory as a plain path (no `file://` scheme). */
function asPath(directory: string): string {
  return directory.replace(/^file:\/\//, '').replace(/\/+$/, '');
}

/** Reads the directory, whether it was handed over as a value or a thunk. */
function resolveDirectory(documentDirectory: DocumentDirectory): string {
  return typeof documentDirectory === 'function' ? documentDirectory() : documentDirectory;
}

/**
 * Resolves the flag's value to a path.
 *
 * An absolute path or a `file://` URI is taken as it is; a bare name is joined
 * onto the app's document directory. Returns null when the flag names nothing
 * (an empty value is not the flag, the same rule as `check-e2e-flag.mjs`).
 */
export function audioFileInput(
  rawFlag: string | undefined,
  documentDirectory: DocumentDirectory,
): AudioFileInput | null {
  const named = (rawFlag ?? '').trim();
  if (named.length === 0) {
    return null;
  }
  if (named.startsWith('/') || named.startsWith('file://')) {
    return { path: asPath(named) };
  }
  return { path: `${asPath(resolveDirectory(documentDirectory))}/${named}` };
}

/**
 * The default file of the E2E build, resolved the same way: the default name in
 * the app's document directory.
 */
export function audioFileInputDefault(documentDirectory: DocumentDirectory): AudioFileInput {
  return {
    path: `${asPath(resolveDirectory(documentDirectory))}/${DEFAULT_AUDIO_FILE_INPUT_NAME}`,
  };
}
