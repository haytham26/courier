/**
 * The turn routing of `useCourierVoice` (D1): a finished transcript is routed
 * before anything is sent - `free` commands are answered on the phone (the
 * command is published and the ack spoken, NO HTTP call), `ignore` turns
 * answer null, and only `full` turns reach the voice service, whose `gate`
 * answer is passed through and whose question (notice with no action) is
 * remembered as `lastQuestion`.
 *
 * The voice service is mocked (the engines are native), the command channel
 * is mocked so the published command is asserted, and the client is a fake.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

jest.mock('../VoiceService', () => ({
  voiceService: { speak: jest.fn(() => Promise.resolve()) },
}));
jest.mock('../commandChannel', () => ({ publishVoiceCommand: jest.fn() }));
// The hook imports the app's auth client for its default token getter; the
// better-auth package is ESM-only and does not load in jest, so it is mocked
// (the tests pass their own getToken and client anyway).
jest.mock('@/lib/auth-client', () => ({ sessionToken: jest.fn(() => Promise.resolve('token')) }));

import { publishVoiceCommand } from '../commandChannel';
import { voiceService } from '../VoiceService';
import type { CourierVoiceClient, CourierVoiceTurn } from '../courierVoiceClient';
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '../settings';
import { useCourierVoice, type CourierVoiceApi } from '../useCourierVoice';

const speakMock = (voiceService as unknown as { speak: jest.Mock }).speak;
const publishMock = publishVoiceCommand as jest.Mock;

function answerOf(overrides: Partial<CourierVoiceTurn>): CourierVoiceTurn {
  return {
    speech: 'Four stops left on the run.',
    action: null,
    engine: 'server-brain',
    source: 'server',
    mode: 'auto',
    barge_in: false,
    ended_turn: true,
    priority: 'now',
    notice: null,
    words: 6,
    latency_ms: 42,
    gate: 'full',
    ...overrides,
  };
}

function fakeClient(
  sendTurnImpl?: (id: string, turn: { transcript: string }) => Promise<CourierVoiceTurn>,
): { client: CourierVoiceClient; sendTurn: jest.Mock } {
  const cannedSession = {
    id: 'session-1',
    driver_id: 'driver-1',
    shift_id: null,
    turns: 0,
    settings: DEFAULT_VOICE_SETTINGS,
    remembered: true,
  };
  // The sendTurn mock is kept in a local so the assertions never reference
  // the method unbound (the lint rule's point).
  const sendTurn = jest.fn(sendTurnImpl ?? (() => Promise.resolve(answerOf({}))));
  const client = {
    startSession: jest.fn(() => Promise.resolve(cannedSession)),
    readSession: jest.fn(() => Promise.resolve(cannedSession)),
    sendTurn,
    proactive: jest.fn(() => Promise.resolve({ kind: null, text: '', words: 0 })),
    forgetSession: jest.fn(() => Promise.resolve()),
    readSettings: jest.fn(() => Promise.resolve(DEFAULT_VOICE_SETTINGS)),
    writeSettings: jest.fn((settings: VoiceSettings) => Promise.resolve(settings)),
    engines: jest.fn(() => Promise.resolve([])),
    licences: jest.fn(() => Promise.resolve([])),
  } as unknown as CourierVoiceClient;
  return { client, sendTurn };
}

let api: CourierVoiceApi;

function Probe({ client }: { client: CourierVoiceClient }) {
  api = useCourierVoice({
    driverId: 'driver-1',
    getToken: () => Promise.resolve('token'),
    client,
  });
  return null;
}

describe('useCourierVoice sendTurn routing (D1, BUG-231)', () => {
  beforeEach(() => {
    publishMock.mockClear();
    speakMock.mockClear();
  });

  it('answers a context-free command on the phone: published, acked, no HTTP', async () => {
    const { client, sendTurn } = fakeClient();
    render(<Probe client={client} />);
    await act(async () => {});

    let answer: CourierVoiceTurn | null = null;
    await act(async () => {
      answer = await api.sendTurn('delivered');
    });

    expect(sendTurn).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledWith({ type: 'mark_delivered', stopId: 'current' });
    expect(answer?.gate).toBe('free');
    expect(answer?.speech).toBe('Delivered.');
    expect(speakMock).toHaveBeenCalledWith('Delivered.');
    expect(api.lastGate).toBe('free');
    expect(api.lastAnswer?.speech).toBe('Delivered.');
  });

  it('sends a conversation turn to the service and passes the gate through', async () => {
    const { client, sendTurn } = fakeClient();
    render(<Probe client={client} />);
    await act(async () => {});

    let answer: CourierVoiceTurn | null = null;
    await act(async () => {
      answer = await api.sendTurn('how many stops are left on the run');
    });

    expect(sendTurn).toHaveBeenCalledTimes(1);
    const [sessionId, body] = sendTurn.mock.calls[0] as [string, { transcript: string }];
    expect(sessionId).toBe('session-1');
    expect(body.transcript).toBe('how many stops are left on the run');
    expect(answer?.gate).toBe('full');
    expect(answer?.speech).toBe('Four stops left on the run.');
    expect(api.lastGate).toBe('full');
    expect(api.lastAnswer?.speech).toBe('Four stops left on the run.');
    expect(api.lastQuestion).toBeNull();
  });

  it('remembers the question when the answer carries a notice and no action', async () => {
    const { client } = fakeClient(() =>
      Promise.resolve(
        answerOf({ speech: 'Was that the red van at the gate?', notice: 'Was that the red van at the gate?', action: null }),
      ),
    );
    render(<Probe client={client} />);
    await act(async () => {});

    await act(async () => {
      await api.sendTurn('was that the red van at the gate?');
    });

    expect(api.lastQuestion).toBe('Was that the red van at the gate?');
  });

  it('ignores a turn with no words: null, no HTTP, no command', async () => {
    const { client, sendTurn } = fakeClient();
    render(<Probe client={client} />);
    await act(async () => {});

    let answer: CourierVoiceTurn | null = { speech: 'x' } as CourierVoiceTurn;
    await act(async () => {
      answer = await api.sendTurn('...');
    });

    expect(answer).toBeNull();
    expect(sendTurn).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
    expect(api.lastGate).toBe('ignore');
  });

  it('falls back to the local parser when the service is unreachable on a full turn', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('the voice service cannot be reached')));
    render(<Probe client={client} />);
    await act(async () => {});

    let answer: CourierVoiceTurn | null = null;
    await act(async () => {
      answer = await api.sendTurn('how many left');
    });

    expect(answer).toBeNull();
    expect(publishMock).toHaveBeenCalledWith({ type: 'how_many_left' });
    expect(api.error).toMatch(/cannot be reached/);
  });
});
