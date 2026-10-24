/**
 * The Copilot surface (screen 07): the map, the conversation and the two
 * choices about the last thing Copilot did.
 *
 * The screen is driven by the app's own voice command channel, so a command
 * published down it lands here exactly the way the engine's does - the same
 * path the design lab exercised, now on the chosen components.
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import CopilotScreen from '../copilot';

/** The stable spies, poured out by the mocks' factories (the `mock` prefix is the hoisting contract). */
let mockBack: jest.Mock | undefined;
let mockStartListening: jest.Mock | undefined;
let mockStopListening: jest.Mock | undefined;

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  const view = (props: { testID?: string; children?: React.ReactNode }) =>
    ReactActual.createElement(RN.View, { testID: props.testID }, props.children);

  return {
    Map: view,
    Camera: () => null,
    Marker: view,
    NativeUserLocation: () => null,
  };
});

jest.mock('expo-router', () => {
  const back = jest.fn();
  mockBack = back;
  return {
    useRouter: () => ({ back, push: jest.fn(), navigate: jest.fn() }),
  };
});

jest.mock('@/maps/useMapBoot', () => ({
  useMapBoot: () => ({ tileSource: { kind: 'none' }, glyphsUrl: null }),
}));

jest.mock('@/maps/styles', () => ({ getCourierStyle: () => ({ name: 'courier-copilot-day' }) }));

jest.mock('@/maps/drive', () => ({ DRIVE_ORIGIN_LNGLAT: [172.6, -43.5] }));

jest.mock('@/maps/stops', () => ({
  mockStops: [
    { id: 'stop-1', sequence: 1, address: '45 Papanui Road', suburb: 'St Albans', status: 'pending', coordinates: { lng: 172.6, lat: -43.5 } },
    { id: 'stop-2', sequence: 2, address: '140 Harewood Road', suburb: 'Merivale', status: 'pending', coordinates: { lng: 172.6, lat: -43.5 } },
    { id: 'stop-3', sequence: 3, address: '120 Blenheim Road', suburb: 'Riccarton', status: 'pending', coordinates: { lng: 172.6, lat: -43.5 } },
  ],
}));

jest.mock('@/maps/runState', () => ({
  useRun: () => ({ delivered: [], isDelivered: () => false, markDelivered: jest.fn(), undoDelivered: jest.fn() }),
}));

let commandListener: ((command: { type: string; stopId?: string | null }) => void) | null = null;
jest.mock('@/voice/commandChannel', () => ({
  publishVoiceCommand: jest.fn(),
  subscribeToVoiceCommands: (listener: (command: { type: string; stopId?: string | null }) => void) => {
    commandListener = listener;
    return () => {
      commandListener = null;
    };
  },
}));

jest.mock('@/voice/useVoice', () => {
  const startListening = jest.fn();
  const stopListening = jest.fn();
  mockStartListening = startListening;
  mockStopListening = stopListening;
  return {
    useVoice: () => ({
      state: 'idle',
      isReady: true,
      lastTranscript: '',
      lastCommand: null,
      startListening,
      stopListening,
      speak: jest.fn(),
    }),
  };
});

jest.mock('@/motion/haptics', () => ({ hapticFor: jest.fn() }));
jest.mock('@/motion/useReducedMotion', () => ({ useReducedMotion: () => false }));
jest.mock('@/voice/useMicrophoneLevel', () => ({ MicrophoneLevel: () => null }));

const renderScreen = () => {
  const utils = render(<CopilotScreen />);
  return utils;
};

describe('the Copilot surface (07)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the map, the bar and the conversation', () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId('copilot-screen')).toBeTruthy();
    expect(getByTestId('copilot-map')).toBeTruthy();
    expect(getByTestId('copilot-panel')).toBeTruthy();
    expect(getByTestId('tab-bar')).toBeTruthy();
    expect(getByTestId('copilot-title')).toBeTruthy();
  });

  it('starts the conversation saying so, and never invents a turn', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    expect(getByTestId('copilot-empty').props.children).toContain('Say what you need');
    expect(queryByTestId('copilot-result')).toBeNull();
    expect(queryByTestId('copilot-reply')).toBeNull();
  });

  it('opens the transcript with the run\u2019s own numbers when a command lands on the channel', () => {
    const { getByTestId } = renderScreen();

    act(() => {
      commandListener?.({ type: 'mark_delivered', stopId: 'stop-2' });
    });

    // The reply names the real stop and the real remaining count (3 stops, 1
    // just delivered), so the screen cannot drift from what the run did.
    expect(getByTestId('copilot-said').props.children).toBe('mark delivered');
    expect(getByTestId('copilot-reply').props.children).toBe(
      'Stop 140 Harewood Road delivered. 2 to go.',
    );
  });

  it('gives the last action an Undo, and spends it', () => {
    const { getByTestId } = renderScreen();

    act(() => {
      commandListener?.({ type: 'mark_delivered', stopId: 'stop-2' });
    });
    expect(getByTestId('copilot-undo')).toBeTruthy();

    fireEvent.press(getByTestId('copilot-undo'));

    expect(getByTestId('copilot-reply').props.children).toBe(
      'Stop 140 Harewood Road delivered. 2 to go. (undone)',
    );
    // The line stays for the record; the Undo is spent, so the control goes.
    expect(() => getByTestId('copilot-undo')).toThrow();
  });

  it('offers the customer message only for the action that has one', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    act(() => {
      commandListener?.({ type: 'mark_delivered', stopId: 'stop-2' });
    });
    expect(queryByTestId('copilot-text-customer')).toBeNull();

    act(() => {
      commandListener?.({ type: 'mark_failed', stopId: 'stop-2' });
    });
    expect(getByTestId('copilot-text-customer')).toBeTruthy();
  });

  it('Stop ends the turn and leaves the surface', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('copilot-stop'));

    expect(mockStopListening).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('the sphere starts talking', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('copilot-sphere'));

    expect(mockStartListening).toHaveBeenCalled();
  });
});
