/**
 * The tests of the app's one HTTP boundary to the API.
 *
 * The fetch is a fake: what is asserted here is this boundary's own
 * contract - the URL it builds, the header it carries, how it classifies
 * every answer the contract can give, and how it translates the phone's
 * delivery events into the contract's own words. The server's behaviour is
 * the API's own suite and the CI E2E job, not a unit test.
 *
 * The auth client is mocked so no test needs a session store or an auth
 * service; the client takes its token from it, and the mock records that.
 */
import type { DeliveryEvent as ContractDeliveryEvent } from '@courier/shared/src/generated/api';

import { CourierApiClient, DEFAULT_API_BASE_URL, getApiBaseUrl } from '@/lib/api-client';
import { toAppEvent, toContractEvent } from '@/lib/api-events';
import type { DeliveryEvent } from '@/sync/types';

jest.mock('@/lib/auth-client', () => ({ sessionToken: jest.fn() }));

const authClientMock = jest.requireMock<{ sessionToken: jest.Mock }>('@/lib/auth-client');

interface Call {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

interface Answer {
  status?: number;
  body?: unknown;
  /** The 200 answer is not JSON at all (a proxy page, a captive portal). */
  brokenJson?: boolean;
  /** The network itself is gone: the fetch rejects. */
  networkError?: Error;
}

function aFetch(answers: Answer[]): { impl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  let index = 0;
  const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const answer = answers[Math.min(index, answers.length - 1)];
    index += 1;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    if (answer?.networkError !== undefined) {
      return Promise.reject(answer.networkError);
    }
    const status = answer?.status ?? 200;
    return Promise.resolve({
      ok: status < 400,
      status,
      json:
        answer?.brokenJson === true
          ? () => Promise.reject(new Error('the answer was an html page'))
          : () => Promise.resolve(answer?.body ?? {}),
    } as Response);
  };
  return { impl, calls };
}

/** A fetch that never answers: the call can only end by its timeout. */
function aFetchThatNeverAnswers(): typeof fetch {
  return (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(Object.assign(new Error('the call was aborted'), { name: 'AbortError' })),
      );
    });
}

function aClient(
  impl: typeof fetch,
  overrides: { getToken?: () => Promise<string | null>; timeoutMs?: number } = {},
): CourierApiClient {
  return new CourierApiClient({
    baseUrl: 'http://api.test',
    getToken: overrides.getToken ?? (() => Promise.resolve('token-1')),
    fetchImpl: impl,
    timeoutMs: overrides.timeoutMs,
  });
}

/** One event of the phone, as the app's log records it. */
function anEvent(overrides: Partial<DeliveryEvent> = {}): DeliveryEvent {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    stopId: '22222222-2222-2222-2222-222222222222',
    kind: 'delivered',
    occurredAt: '2026-10-21T02:00:00.000Z',
    ...overrides,
  };
}

describe('the base URL of the API', () => {
  it('builds every request on the base URL it is given', async () => {
    const { impl, calls } = aFetch([{ body: { id: 'run-1' } }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('ok');
    expect(calls[0]?.url).toBe('http://api.test/runs/run-1');
  });

  it('takes one slash between the base URL and the path', async () => {
    const { impl, calls } = aFetch([{ body: { id: 'run-1' } }]);

    await new CourierApiClient({
      baseUrl: 'http://api.test/',
      getToken: () => Promise.resolve('token-1'),
      fetchImpl: impl,
    }).getRun('run-1');

    expect(calls[0]?.url).toBe('http://api.test/runs/run-1');
  });

  it('escapes the run id into the path', async () => {
    const { impl, calls } = aFetch([{ body: {} }]);

    await aClient(impl).getRun('run 1/x');

    expect(calls[0]?.url).toBe('http://api.test/runs/run%201%2Fx');
  });

  it('falls back to the local API when the build configures nothing', () => {
    expect(getApiBaseUrl('')).toBe('http://localhost:8000');
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:8000');
  });
});

describe('the session of the courier', () => {
  it("carries the courier's token on every request", async () => {
    const { impl, calls } = aFetch([{ body: { stops: [] } }, { body: { accepted: 1 } }]);

    await aClient(impl).getStops('shift-1');
    await aClient(impl).postDeliveryEvents('shift-1', [anEvent()]);

    expect(calls[0]?.headers.Authorization).toBe('Bearer token-1');
    expect(calls[1]?.headers.Authorization).toBe('Bearer token-1');
  });

  it('takes the token from the session when the caller gives none', async () => {
    const { impl, calls } = aFetch([{ body: { id: 'run-1' } }]);
    authClientMock.sessionToken.mockResolvedValue('token-9');

    await new CourierApiClient({ baseUrl: 'http://api.test', fetchImpl: impl }).getRun('run-1');

    expect(calls[0]?.headers.Authorization).toBe('Bearer token-9');
  });

  it('does not call the API when there is no session', async () => {
    const { impl, calls } = aFetch([{ body: {} }]);

    const outcome = await aClient(impl, { getToken: () => Promise.resolve(null) }).getRun('run-1');

    expect(outcome.status).toBe('unauthorized');
    expect(calls.length).toBe(0);
  });

  it('treats a blank token as no session', async () => {
    const { impl, calls } = aFetch([{ body: {} }]);

    const outcome = await aClient(impl, { getToken: () => Promise.resolve('  ') }).getRun('run-1');

    expect(outcome.status).toBe('unauthorized');
    expect(calls.length).toBe(0);
  });
});

describe('the answers of the API', () => {
  it('answers the run when the API answers 200', async () => {
    const run = { id: 'run-1', shift_id: 'shift-1', name: 'Hornby' };
    const { impl } = aFetch([{ body: run }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') {
      return;
    }
    expect(outcome.data.name).toBe('Hornby');
  });

  it('answers unauthorized when the API answers 401', async () => {
    const { impl } = aFetch([{ status: 401, body: { message: 'the token expired' } }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('unauthorized');
  });

  it("answers with the server's own sentence when it fails", async () => {
    const { impl } = aFetch([{ status: 500, body: { message: 'the database is gone' } }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('server');
    if (outcome.status !== 'server') {
      return;
    }
    expect(outcome.code).toBe(500);
    expect(outcome.message).toBe('the database is gone');
  });

  it('falls back to the error field when the failure has no message', async () => {
    const { impl } = aFetch([{ status: 503, body: { error: 'the API is restarting' } }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('server');
    if (outcome.status !== 'server') {
      return;
    }
    expect(outcome.message).toBe('the API is restarting');
  });

  it("answers the server when the run is another courier's", async () => {
    const { impl } = aFetch([{ status: 404, body: { message: 'no run for this id' } }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('server');
    if (outcome.status !== 'server') {
      return;
    }
    expect(outcome.code).toBe(404);
    expect(outcome.message).toBe('no run for this id');
  });

  it('answers offline when the network throws', async () => {
    const { impl } = aFetch([{ networkError: new Error('the radio is off') }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('offline');
  });

  it('answers offline when the call takes too long', async () => {
    const client = aClient(aFetchThatNeverAnswers(), { timeoutMs: 5 });

    const outcome = await client.getRun('run-1');

    expect(outcome.status).toBe('offline');
  });

  it('answers the server when the 200 answer is not JSON', async () => {
    const { impl } = aFetch([{ brokenJson: true }]);

    const outcome = await aClient(impl).getRun('run-1');

    expect(outcome.status).toBe('server');
    if (outcome.status !== 'server') {
      return;
    }
    expect(outcome.message).toContain('was not JSON');
  });

  it('answers the server when the 200 answer is not the shape the contract declares', async () => {
    const { impl } = aFetch([{ body: { stops: [] } }]);

    const outcome = await aClient(impl).getStops('shift-1');

    expect(outcome.status).toBe('server');
    if (outcome.status !== 'server') {
      return;
    }
    expect(outcome.message).toContain('not the');
  });
});

describe('the stops of a shift', () => {
  it('asks for the stops of the shift without a filter', async () => {
    const stops = [
      { id: 'stop-1', location_id: 'loc-1', address: '12 Riccarton Road', seq: 1, status: 'pending' },
    ];
    const { impl, calls } = aFetch([{ body: stops }]);

    const outcome = await aClient(impl).getStops('shift-1');

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') {
      return;
    }
    expect(outcome.data[0]?.id).toBe('stop-1');
    expect(calls[0]?.url).toBe('http://api.test/shifts/shift-1/stops');
    expect(calls[0]?.method).toBe('GET');
  });

  it('filters the stops by the status of the contract', async () => {
    const { impl, calls } = aFetch([{ body: [] }]);

    await aClient(impl).getStops('shift-1', { status: 'delivered' });

    expect(calls[0]?.url).toBe('http://api.test/shifts/shift-1/stops?status=delivered');
  });
});

describe('the delivery events of the phone', () => {
  it("sends the app's event in the contract's own words", async () => {
    const { impl, calls } = aFetch([{ body: { accepted: 1, cursor: 7 } }]);
    const event = anEvent({
      utterance: 'left it with the neighbour',
      safePlace: 'under the mat',
      lat: -43.532,
      lon: 172.599,
      accuracyM: 8,
    });

    const outcome = await aClient(impl).postDeliveryEvents('shift-1', [event]);

    expect(outcome.status).toBe('ok');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe('http://api.test/shifts/shift-1/events:batch');
    expect(calls[0]?.body).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        stop_id: '22222222-2222-2222-2222-222222222222',
        kind: 'delivered',
        occurred_at: '2026-10-21T02:00:00.000Z',
        utterance: 'left it with the neighbour',
        safe_place: 'under the mat',
        lat: -43.532,
        lon: 172.599,
        accuracy_m: 8,
      },
    ]);
  });

  it("translates a safe place into the contract's left_at", () => {
    const mapping = toContractEvent(anEvent({ kind: 'safe_place', safePlace: 'behind the bin' }));

    expect(mapping.status).toBe('mapped');
    if (mapping.status !== 'mapped') {
      return;
    }
    expect(mapping.event.kind).toBe('left_at');
    expect(mapping.event.safe_place).toBe('behind the bin');
  });

  it("reads a contract event back into the app's words", () => {
    const appEvent = toAppEvent({
      id: '33333333-3333-3333-3333-333333333333',
      stop_id: '44444444-4444-4444-4444-444444444444',
      kind: 'left_at',
      safe_place: 'in the porch',
      occurred_at: '2026-10-21T03:00:00.000Z',
    } satisfies ContractDeliveryEvent);

    expect(appEvent.stopId).toBe('44444444-4444-4444-4444-444444444444');
    expect(appEvent.kind).toBe('safe_place');
    expect(appEvent.safePlace).toBe('in the porch');
    expect(appEvent.occurredAt).toBe('2026-10-21T03:00:00.000Z');
  });

  it('refuses a batch that holds an event the API has no kind for', async () => {
    const { impl, calls } = aFetch([{ body: { accepted: 1 } }]);

    const outcome = await aClient(impl).postDeliveryEvents('shift-1', [
      anEvent(),
      anEvent({ id: '55555555-5555-5555-5555-555555555555', kind: 'note' }),
    ]);

    expect(outcome.status).toBe('unmappable');
    if (outcome.status !== 'unmappable') {
      return;
    }
    expect(outcome.message).toContain('note');
    expect(calls.length).toBe(0);
  });
});

describe('the seeded day', () => {
  it('seeds the day with the reason the app asks for', async () => {
    const { impl, calls } = aFetch([{ body: { run_id: 'run-1', shift_id: 'shift-1', stops: [] } }]);

    const outcome = await aClient(impl).seedDemoRun('demo');

    expect(outcome.status).toBe('ok');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe('http://api.test/demo/runs');
    expect(calls[0]?.body).toEqual({ reason: 'demo' });
    expect(calls[0]?.headers['Content-Type']).toBe('application/json');
  });

  it('leaves the reason out when the app names none', async () => {
    const { impl, calls } = aFetch([{ body: { run_id: 'run-1', shift_id: 'shift-1', stops: [] } }]);

    await aClient(impl).seedDemoRun();

    expect(calls[0]?.body).toEqual({});
  });
});
