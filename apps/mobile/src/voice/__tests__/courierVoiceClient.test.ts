/**
 * Tests for the client of Courier Voice.
 *
 * The client is tested with a fake fetch: the shape of the calls, the bearer
 * token, the retry, and the translation of the service's actions into the
 * commands of the app.
 */

import {
  CourierVoiceClient,
  CourierVoiceUnavailableError,
  toVoiceCommand,
  type CourierVoiceAction,
} from '../courierVoiceClient';

interface Call {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

function aFetch(
  answers: { status?: number; body: unknown }[],
): { impl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  let index = 0;
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const answer = answers[Math.min(index, answers.length - 1)];
    index += 1;
    calls.push({
      url: String(input),
      method: String(init?.method ?? 'GET'),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const status = answer?.status ?? 200;
    return {
      ok: status < 400,
      status,
      json: async () => answer?.body ?? {},
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('the client of Courier Voice', () => {
  it('starts a shift with the token of the courier', async () => {
    const { impl, calls } = aFetch([
      { body: { id: 'session-1', driver_id: 'driver-1', shift_id: null, turns: 0 } },
    ]);
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test/',
      getToken: async () => 'token-1',
      fetchImpl: impl,
    });

    const session = await client.startSession();

    expect(session.id).toBe('session-1');
    expect(calls[0].url).toBe('http://voice.test/v1/sessions');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers.Authorization).toBe('Bearer token-1');
  });

  it('sends a turn with the settings of the courier', async () => {
    const { impl, calls } = aFetch([{ body: { speech: 'Eight stops left.', action: null } }]);
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test',
      getToken: async () => 'token-1',
      fetchImpl: impl,
    });

    await client.sendTurn('session-1', {
      transcript: 'how many left?',
      speed_kmh: 40,
      mode: 'auto',
    });

    const body = calls[0].body as { transcript: string; speed_kmh: number };
    expect(calls[0].url).toBe('http://voice.test/v1/sessions/session-1/turn');
    expect(body.transcript).toBe('how many left?');
    expect(body.speed_kmh).toBe(40);
  });

  it('asks the service what it wants to say first', async () => {
    const { impl, calls } = aFetch([
      { body: { kind: 'morning_brief', text: '214 stops, 3 new addresses, rain after 2', words: 8 } },
    ]);
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test',
      getToken: async () => 'token-1',
      fetchImpl: impl,
    });

    const line = await client.proactive('session-1', 'shift_start');

    expect(line.kind).toBe('morning_brief');
    expect(calls[0].url).toBe('http://voice.test/v1/sessions/session-1/proactive');
  });

  it('reads and writes the settings', async () => {
    const { impl, calls } = aFetch([
      { body: { settings: { verbosity: 'chatty' } } },
      { body: { settings: { verbosity: 'minimal' } } },
    ]);
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test',
      getToken: async () => 'token-1',
      fetchImpl: impl,
    });

    const first = await client.readSettings();
    const second = await client.writeSettings(first);

    expect(calls[0].method).toBe('GET');
    expect(calls[1].method).toBe('PUT');
    expect(second).toEqual({ verbosity: 'minimal' });
  });

  it('refuses to call the service without a session', async () => {
    const { impl, calls } = aFetch([{ body: {} }]);
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test',
      getToken: async () => null,
      fetchImpl: impl,
    });

    await expect(client.startSession()).rejects.toBeInstanceOf(CourierVoiceUnavailableError);
    expect(calls).toHaveLength(0);
  });

  it('tries again once when the service does not answer', async () => {
    const { impl, calls } = aFetch([{ status: 500, body: {} }]);
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test',
      getToken: async () => 'token-1',
      fetchImpl: impl,
    });

    await expect(client.startSession()).rejects.toBeInstanceOf(CourierVoiceUnavailableError);
    expect(calls.length).toBe(2);
  });

  it('gives up with a plain sentence when the service is not there', async () => {
    const failing = (async () => {
      throw new Error('the network is down');
    }) as unknown as typeof fetch;
    const client = new CourierVoiceClient({
      baseUrl: 'http://voice.test',
      getToken: async () => 'token-1',
      fetchImpl: failing,
    });

    await expect(client.startSession()).rejects.toThrow(/cannot be reached/);
  });
});

describe('the actions of the service in the commands of the app', () => {
  it('turns a delivery into a delivery', () => {
    const action: CourierVoiceAction = { type: 'mark_delivered' };
    expect(toVoiceCommand(action)).toEqual({ type: 'mark_delivered', stopId: 'current' });
  });

  it('keeps the reason of a failed delivery', () => {
    const action: CourierVoiceAction = { type: 'mark_failed', reason: 'dog' };
    expect(toVoiceCommand(action)).toEqual({
      type: 'mark_failed',
      stopId: 'current',
      reason: 'dog',
    });
  });

  it('turns a skip into a skip', () => {
    expect(toVoiceCommand({ type: 'skip_stop' })).toEqual({
      type: 'mark_skipped',
      stopId: 'current',
    });
  });

  it('turns the map commands into the map commands', () => {
    expect(toVoiceCommand({ type: 'set_map_mode', mode: '3d' })).toEqual({
      type: 'set_map_mode',
      mode: '3d',
    });
    expect(toVoiceCommand({ type: 'zoom_to_next_stop' })).toEqual({
      type: 'zoom_to_next_stop',
    });
    expect(toVoiceCommand({ type: 'follow_me', on: true })).toEqual({
      type: 'follow_me',
      on: true,
    });
  });

  it('turns a new stop into a new stop', () => {
    expect(toVoiceCommand({ type: 'add_stop', raw_address: '5 Rimu Street' })).toEqual({
      type: 'add_stop',
      rawAddress: '5 Rimu Street',
    });
  });

  it('says nothing about an action the app does not know', () => {
    expect(toVoiceCommand({ type: 'something_new' })).toBeNull();
    expect(toVoiceCommand(null)).toBeNull();
  });
});
