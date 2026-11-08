/**
 * The audio-file seam of this build (option C of the audio-injection research,
 * `docs/research/2026/voice-audio-injection.md`): the module that answers, for
 * THIS build, whether an audio FILE may feed the on-device recognizer and from
 * where it is read.
 *
 * The release guarantee is the test's first claim: a release build answers
 * `never`, even when the flag is inlined - `__DEV__` is false in a shipped
 * artifact and BUG-079's `check-e2e-flag.mjs` refuses both `EXPO_PUBLIC_E2E`
 * and `EXPO_PUBLIC_E2E_AUDIO_FILE` in a release variant, so the flag never
 * reaches the bundle a courier runs.
 */
jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///data/user/0/com.courier.copilot/files/' } },
}));

import { audioSourceForThisBuild } from '../audioSourceForThisBuild';

/** The document directory the expo-file-system mock answers with, as a path. */
const DOCUMENT_DIR = '/data/user/0/com.courier.copilot/files';

describe('audioSourceForThisBuild (the option-C seam)', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_E2E;
    delete process.env.EXPO_PUBLIC_E2E_AUDIO_FILE;
  });

  it('a release build never answers an audio file, even with the flag inlined', () => {
    // The shipped variant: __DEV__ false and no E2E flag. The flag can only be
    // set here if a release build inlined it, which check-e2e-flag.mjs refuses.
    expect(
      audioSourceForThisBuild({ dev: false, e2e: false, flag: 'e2e-utterance.wav' }),
    ).toEqual({ kind: 'never' });
    expect(audioSourceForThisBuild({ dev: false, e2e: false, flag: undefined })).toEqual({
      kind: 'never',
    });
  });

  it('a test build with the flag set answers the file, named from the document dir', () => {
    expect(
      audioSourceForThisBuild({ dev: true, e2e: false, flag: 'utterance.wav' }),
    ).toEqual({ kind: 'file', path: `${DOCUMENT_DIR}/utterance.wav` });
  });

  it('an absolute path or a file URI in the flag is taken as it is', () => {
    expect(audioSourceForThisBuild({ dev: true, e2e: false, flag: '/sdcard/x.wav' })).toEqual(
      { kind: 'file', path: '/sdcard/x.wav' },
    );
    expect(
      audioSourceForThisBuild({ dev: false, e2e: true, flag: 'file:///data/local/x.wav' }),
    ).toEqual({ kind: 'file', path: '/data/local/x.wav' });
  });

  it('the E2E build without the flag answers the runner-armed default file', () => {
    // The e2e variant APK (a release build that declares itself a test
    // artifact): .maestro/run-all.sh pushes the fixture WAV under the default
    // name into the app's document dir before the flows run.
    expect(audioSourceForThisBuild({ dev: false, e2e: true, flag: undefined })).toEqual({
      kind: 'file',
      path: `${DOCUMENT_DIR}/e2e-utterance.wav`,
    });
  });

  it('a debug build without the flag answers never: the live microphone', () => {
    expect(audioSourceForThisBuild({ dev: true, e2e: false, flag: undefined })).toEqual({
      kind: 'never',
    });
  });

  it('the default flavour reads the inlined flags at call time', () => {
    process.env.EXPO_PUBLIC_E2E_AUDIO_FILE = 'utterance.wav';
    expect(audioSourceForThisBuild()).toEqual({
      kind: 'file',
      path: `${DOCUMENT_DIR}/utterance.wav`,
    });
    delete process.env.EXPO_PUBLIC_E2E_AUDIO_FILE;
    process.env.EXPO_PUBLIC_E2E = '1';
    expect(audioSourceForThisBuild()).toEqual({
      kind: 'file',
      path: `${DOCUMENT_DIR}/e2e-utterance.wav`,
    });
  });
});
