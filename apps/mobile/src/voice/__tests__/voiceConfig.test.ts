/**
 * The `VoiceConfig` of this build (D1): the one place a config is built, from
 * the build's own environment, so the tab layout can own the voice service
 * with `useVoice(voiceConfigFromBuild(...))` instead of no screen initializing
 * it at all (BUG-231).
 */
import { voiceConfigFromBuild } from '../voiceConfig';

const ENV_KEYS = [
  'EXPO_PUBLIC_VOICE_MODELS_DIR',
  'EXPO_PUBLIC_STT_MODEL_PATH',
  'EXPO_PUBLIC_TTS_MODEL_PATH',
  'EXPO_PUBLIC_VAD_MODEL_PATH',
  'EXPO_PUBLIC_KWS_MODEL_PATH',
  'EXPO_PUBLIC_VOICE_SERVICE_URL',
];

describe('voiceConfigFromBuild (BUG-231)', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('builds the default config under the models dir, at the local voice service', () => {
    const config = voiceConfigFromBuild();
    expect(config.sttModelPath).toBe('models/stt.onnx');
    expect(config.ttsModelPath).toBe('models/tts.onnx');
    expect(config.vadModelPath).toBe('models/vad.onnx');
    expect(config.kwsModelPath).toBe('models/kws.onnx');
    expect(config.pipecatServerUrl).toBe('http://localhost:8080');
    expect(config.language).toBe('en-NZ');
  });

  it('honours the per-model env overrides and the language argument', () => {
    process.env.EXPO_PUBLIC_STT_MODEL_PATH = '/data/models/stt.onnx';
    process.env.EXPO_PUBLIC_TTS_MODEL_PATH = '/data/models/tts.onnx';
    process.env.EXPO_PUBLIC_VOICE_SERVICE_URL = 'https://voice.example.test';
    const config = voiceConfigFromBuild('mi-NZ');
    expect(config.sttModelPath).toBe('/data/models/stt.onnx');
    expect(config.ttsModelPath).toBe('/data/models/tts.onnx');
    expect(config.vadModelPath).toBe('models/vad.onnx');
    expect(config.pipecatServerUrl).toBe('https://voice.example.test');
    expect(config.language).toBe('mi-NZ');
  });

  it('honours a custom models dir for every model', () => {
    process.env.EXPO_PUBLIC_VOICE_MODELS_DIR = '/data/models';
    const config = voiceConfigFromBuild('auto');
    expect(config.sttModelPath).toBe('/data/models/stt.onnx');
    expect(config.ttsModelPath).toBe('/data/models/tts.onnx');
    expect(config.vadModelPath).toBe('/data/models/vad.onnx');
    expect(config.kwsModelPath).toBe('/data/models/kws.onnx');
    expect(config.language).toBe('auto');
  });
});
