/**
 * The earbud button listeners, with more than one subscriber (BUG-082).
 *
 * The audit's probe: `removeListeners(count)` called `removeAllListeners()`,
 * so the argument was ignored and one unmounting subscriber detached EVERY
 * earbud listener on the emitter. With a single subscriber the effect is
 * invisible - which is why it stayed latent: `useEarbudButtons` has no
 * production caller yet. With two, a screen closing silences the other, and
 * the courier's earbud stops answering while the app is still on screen.
 *
 * The contract these tests pin: `removeListeners(count)` removes exactly that
 * many listeners, the newest first, and another subscriber's listener stays
 * attached.
 *
 * react-native is mocked here because NativeEventEmitter is a native bridge
 * object; the wrapper's decision of WHICH listeners it removes is what the app
 * owns, so that is what the test asserts.
 */

// The listeners the mocked NativeEventEmitter holds, mock-prefixed because
// jest's module factories may not close over anything else.
const mockEmitterListeners = new Map<string, Array<(event: unknown) => void>>();

jest.mock('react-native', () => {
  // The real module for everything else (the suite setup and the renderers
  // use it), with only the emitter and the native module replaced: the
  // emitter is a native bridge object a test run has no device for.
    class MockNativeEventEmitter {
    addListener(event: string, fn: (event: unknown) => void): void {
      const forEvent = mockEmitterListeners.get(event) ?? [];
      forEvent.push(fn);
      mockEmitterListeners.set(event, forEvent);
    }

    removeListener(event: string, fn: (event: unknown) => void): void {
      const forEvent = mockEmitterListeners.get(event) ?? [];
      mockEmitterListeners.set(
        event,
        forEvent.filter((listener) => listener !== fn),
      );
    }

    removeAllListeners(): void {
      mockEmitterListeners.clear();
    }
  }

  return {
    NativeModules: {
      EarbudButtonManager: {
        startListening: jest.fn(() => Promise.resolve()),
        stopListening: jest.fn(() => Promise.resolve()),
      },
    },
    Platform: { OS: 'android' },
    NativeEventEmitter: MockNativeEventEmitter,
  };
});

// The earbud module's own file reaches VoiceService for its hook, and the
// service's engines are native modules the test run does not have (the same
// virtual mocks the lifecycle suite uses): with them in place the import chain
// stops at the service and never reaches expo-asset's native registry.
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }), { virtual: true });
jest.mock(
  'react-native-sherpa-onnx/stt',
  () => ({ createSTT: jest.fn(), detectSttModel: jest.fn() }),
  { virtual: true },
);
jest.mock(
  'react-native-sherpa-onnx/tts',
  () => ({ createTTS: jest.fn(), detectTtsModel: jest.fn() }),
  { virtual: true },
);
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));

import { EarbudButtonModule, type EarbudEvent } from '../EarbudButtonModule';

/** Fires an earbud event at every listener the emitter still holds. */
function emit(event: EarbudEvent): void {
  for (const listener of mockEmitterListeners.get('earbudEvent') ?? []) {
    listener(event);
  }
}

const EVENT: EarbudEvent = { type: 'single', timestamp: 1 };

describe('the earbud button listeners', () => {
  beforeEach(() => {
    mockEmitterListeners.clear();
  });

  it('carry an event to every subscriber', () => {
    const first = jest.fn();
    const second = jest.fn();
    EarbudButtonModule.addListener('earbudEvent', first);
    EarbudButtonModule.addListener('earbudEvent', second);

    emit(EVENT);

    expect(first).toHaveBeenCalledWith(EVENT);
    expect(second).toHaveBeenCalledWith(EVENT);
  });

  it('remove only the count they were asked to remove (BUG-082)', () => {
    // RED first: with `removeAllListeners()` behind the count, this assertion
    // failed - the first subscriber went silent when the second unmounted.
    const first = jest.fn();
    const second = jest.fn();
    EarbudButtonModule.addListener('earbudEvent', first);
    EarbudButtonModule.addListener('earbudEvent', second);

    EarbudButtonModule.removeListeners(1);
    emit(EVENT);

    expect(first).toHaveBeenCalledWith(EVENT);
    expect(second).not.toHaveBeenCalled();
  });

  it('remove the listener that was added last, not the first', () => {
    // Three subscribers, one unmount: the newest goes, the two that stay still
    // answer. (The emitter holds the wrapper the module created, so the
    // contract is asserted through what still fires.)
    const first = jest.fn();
    const second = jest.fn();
    const third = jest.fn();
    EarbudButtonModule.addListener('earbudEvent', first);
    EarbudButtonModule.addListener('earbudEvent', second);
    EarbudButtonModule.addListener('earbudEvent', third);

    EarbudButtonModule.removeListeners(1);
    emit(EVENT);

    expect(first).toHaveBeenCalledWith(EVENT);
    expect(second).toHaveBeenCalledWith(EVENT);
    expect(third).not.toHaveBeenCalled();
  });

  it('remove nothing they did not add', () => {
    const outsider = jest.fn();
    mockEmitterListeners.set('earbudEvent', [outsider]);

    EarbudButtonModule.removeListeners(1);

    expect(mockEmitterListeners.get('earbudEvent')).toEqual([outsider]);
  });

  it('tolerate a bigger count than they hold', () => {
    const first = jest.fn();
    EarbudButtonModule.addListener('earbudEvent', first);

    EarbudButtonModule.removeListeners(9);

    expect(mockEmitterListeners.get('earbudEvent')).toHaveLength(0);
  });
});
