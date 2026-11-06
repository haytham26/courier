/**
 * The `VoiceConfig` of this build (D1, BUG-231).
 *
 * Before this module no screen ever passed a config to `useVoice`, so
 * `voiceService.initialize` never ran and the microphone always answered
 * "the voice engine was never initialised". This is the one place a config is
 * built, from the build's own environment (`EXPO_PUBLIC_*` is inlined by
 * babel-preset-expo while the bundle is built), so the tab layout can own the
 * voice service with `useVoice(voiceConfigFromBuild(...))`.
 *
 * The model paths default to the app's `models` directory; the on-device
 * model itself (which file, bundled or downloaded, and its licence) is A2's
 * slice and stays founder-gated in `docs/status/FOUNDER_TODO.md` - a phone
 * without the files is answered honestly (`no-model`, with the reason), not
 * with a pretended listening.
 */

import type { VoiceConfig } from './VoiceService';
import type { VoiceLanguage } from './settings';

/** The directory the on-device model files are expected under. */
const DEFAULT_MODELS_DIR = 'models';

/** The file names of the on-device packs under that directory. */
const STT_FILE = 'stt.onnx';
const TTS_FILE = 'tts.onnx';
const VAD_FILE = 'vad.onnx';
const KWS_FILE = 'kws.onnx';

/**
 * Builds the config of this build.
 *
 * Every value is overridable through the environment, so a build (or a test)
 * can point at real files without touching the code. The language comes from
 * the courier's own voice settings.
 */
export function voiceConfigFromBuild(language: VoiceLanguage = 'en-NZ'): VoiceConfig {
  const modelsDir = process.env.EXPO_PUBLIC_VOICE_MODELS_DIR ?? DEFAULT_MODELS_DIR;
  return {
    sttModelPath: process.env.EXPO_PUBLIC_STT_MODEL_PATH ?? `${modelsDir}/${STT_FILE}`,
    ttsModelPath: process.env.EXPO_PUBLIC_TTS_MODEL_PATH ?? `${modelsDir}/${TTS_FILE}`,
    vadModelPath: process.env.EXPO_PUBLIC_VAD_MODEL_PATH ?? `${modelsDir}/${VAD_FILE}`,
    kwsModelPath: process.env.EXPO_PUBLIC_KWS_MODEL_PATH ?? `${modelsDir}/${KWS_FILE}`,
    pipecatServerUrl:
      process.env.EXPO_PUBLIC_VOICE_SERVICE_URL ?? 'http://localhost:8080',
    language,
  };
}
