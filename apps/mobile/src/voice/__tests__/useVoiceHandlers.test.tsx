/**
 * `useVoice` with handlers (D1, BUG-231): the tab layout owns the service and
 * passes `onFinalTranscript`, so a finished sentence reaches the turn flow. The
 * handler is read through a ref, so a handler that changes between renders is
 * honoured without re-initializing the shared service; a consumer that passed
 * no handler keeps the pre-D1 behaviour (the local parser answers).
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => ({ replace: jest.fn(), play: jest.fn(), release: jest.fn() })) }), { virtual: true });
jest.mock(
  'react-native-sherpa-onnx/stt',
  () => ({
    createSTT: jest.fn(() => ({ destroy: jest.fn() })),
    detectSttModel: jest.fn(() => ({ success: true, modelType: 'transducer' })),
    getOnlineTypeOrNull: jest.fn(() => 'transducer'),
    createStreamingSTT: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/audio',
  () => ({
    createPcmLiveStream: jest.fn(() => ({
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      onData: jest.fn(() => () => undefined),
      onError: jest.fn(() => () => undefined),
    })),
    decodeAudioFileToFloatSamples: jest.fn(() => Promise.resolve({ samples: [], sampleRate: 16000 })),
  }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/tts',
  () => ({ createTTS: jest.fn(() => ({ destroy: jest.fn() })), detectTtsModel: jest.fn(() => ({ success: true })) }),
  { virtual: true },
);
jest.mock('../streamingStt', () => ({ aLiveListener: jest.fn() }));
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));

import { publishVoiceCommand } from '../commandChannel';
import { voiceService } from '../VoiceService';
import { useVoice } from '../useVoice';

const publishMock = publishVoiceCommand as jest.Mock;

const CONFIG = {
  sttModelPath: 'models/stt.onnx',
  ttsModelPath: 'models/tts.onnx',
  vadModelPath: 'models/vad.onnx',
  pipecatServerUrl: 'http://localhost:8080',
  language: 'en-NZ' as const,
};

function Probe({ onFinal }: { onFinal?: (text: string) => void }) {
  useVoice(CONFIG, onFinal === undefined ? undefined : { onFinalTranscript: onFinal });
  return <Text testID="probe">probe</Text>;
}

type ServiceInternals = {
  holdTranscript: (text: string, final: boolean) => void;
  shutdown: () => Promise<void>;
};

const svc = (): ServiceInternals => voiceService as unknown as ServiceInternals;

describe('useVoice with a transcript handler (D1, BUG-231)', () => {
  beforeEach(async () => {
    publishMock.mockClear();
    await svc().shutdown().catch(() => undefined);
  });

  it('delegates a final transcript to the handler passed at mount', async () => {
    const onFinal = jest.fn();
    render(<Probe onFinal={onFinal} />);
    await act(async () => {});

    act(() => {
      svc().holdTranscript('delivered', true);
    });

    expect(onFinal).toHaveBeenCalledWith('delivered');
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('honours a handler that changes between renders, without re-initializing', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const mounted = render(<Probe onFinal={first} />);
    await act(async () => {});

    mounted.rerender(<Probe onFinal={second} />);
    await act(async () => {});

    act(() => {
      svc().holdTranscript('how many left', true);
    });

    expect(second).toHaveBeenCalledWith('how many left');
    expect(first).not.toHaveBeenCalled();
  });

  it('keeps the local parser for a consumer that passed no handler', async () => {
    render(<Probe />);
    await act(async () => {});

    act(() => {
      svc().holdTranscript('delivered', true);
    });

    expect(publishMock).toHaveBeenCalledWith({ type: 'mark_delivered', stopId: 'current' });
  });
});
