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

/**
 * The reopt answer as the contract declares it: `finish_delta_s` is a float on
 * the server (a fraction of a second is legal), and the stops are the solver's
 * own order - stop_id and sequence.
 */
function aReoptAnswer() {
  return { run_id: 'run-1', engine: 'vrplib', finish_delta_s: -180, stops: [] };
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

  // BUG-176: the contract's `id` is `format: uuid` and the server parses it as
  // one, so a non-uuid id is refused with a 422 for the WHOLE batch - run
  // 41541777473's a1 job lost every delivery that way, while the same payload
  // with a uuid id answered 200 locally. The transport refuses it here,
  // before a request is built. Red before the fix: the batch was sent.
  it('refuses an event whose id is not a uuid, before any request is built', async () => {
    const { impl, calls } = aFetch([{ body: { accepted: 1 } }]);

    const outcome = await aClient(impl).postDeliveryEvents('shift-1', [
      anEvent({ id: 'delivered-22222222-2222-2222-2222-222222222222-1772000000000' }),
    ]);

    expect(outcome.status).toBe('unmappable');
    if (outcome.status !== 'unmappable') {
      return;
    }
    expect(outcome.message).toContain('uuid');
    expect(calls.length).toBe(0);
  });
});

// Queue 4.2: the reopt call carries the stops the courier touched and answers
// with the server's own new order and finish-time delta.
describe('the reopt route call', () => {
  it('posts the affected stops the caller names', async () => {
    const { impl, calls } = aFetch([{ body: aReoptAnswer() }]);

    const outcome = await aClient(impl).reoptRoute('run-1', ['stop-1', 'stop-2']);

    expect(outcome.status).toBe('ok');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe('http://api.test/runs/run-1/route:reopt');
    expect(calls[0]?.body).toEqual({ affected_stop_ids: ['stop-1', 'stop-2'] });
    expect(calls[0]?.headers['Content-Type']).toBe('application/json');
  });

  it('answers the caller\u2019s unauthorized without dialing the server', async () => {
    const { impl, calls } = aFetch([{ body: {} }]);

    const outcome = await aClient(impl, {
      getToken: () => Promise.resolve(null),
    }).reoptRoute('run-1', ['stop-1']);

    expect(outcome.status).toBe('unauthorized');
    expect(calls.length).toBe(0);
  });

  // BUG-189: the run's own id is missing, so the request could only be built
  // as /runs//route:reopt - a URL that is not the run's, and a round trip
  // that would answer a 404 the courier reads as "the run is gone". The
  // client refuses before it dials, and the screen is told why.
  it('refuses an empty run id without dialing the server (BUG-189)', async () => {
    const { impl, calls } = aFetch([{ body: aReoptAnswer() }]);

    const outcome = await aClient(impl).reoptRoute('', ['stop-1']);

    expect(outcome.status).toBe('refused');
    expect(calls.length).toBe(0);
  });

  it('refuses a run id that is only spaces, too', async () => {
    const { impl, calls } = aFetch([{ body: aReoptAnswer() }]);

    const outcome = await aClient(impl).reoptRoute('   ', ['stop-1']);

    expect(outcome.status).toBe('refused');
    expect(calls.length).toBe(0);
  });

  // The 200 that is not the contract's own answer: the boundary's shape guard
  // exists precisely so a body the contract never declared (a proxy's page, a
  // newer field, a truncated answer) cannot reach a screen as if it were one.
  it('refuses a 200 answer that is not the contract\u2019s own shape', async () => {
    const { impl } = aFetch([{ body: { finish_delta_s: 'three minutes', stops: 'none' } }]);

    const outcome = await aClient(impl).reoptRoute('run-1', ['stop-1']);

    expect(outcome.status).toBe('server');
    if (outcome.status !== 'server') {
      return;
    }
    expect(outcome.message).toMatch(/not the shape the contract declares/);
  });

  it('refuses a 200 answer whose stops are not the order the contract declares', async () => {
    const { impl } = aFetch([{ body: { run_id: 'run-1', engine: 'vrplib', finish_delta_s: 12, stops: [{}] } }]);

    const outcome = await aClient(impl).reoptRoute('run-1', ['stop-1']);

    expect(outcome.status).toBe('server');
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

/**
 * Queue 4e (the trial's #6, ADR-025's app half): the spreadsheet import,
 * `POST /shifts/{shift_id}/import` with the file as one multipart part.
 *
 * The import is all-or-nothing on the server, so the client's own contract is
 * exact: the file rides as multipart (never a JSON body, never a Content-Type
 * the platform's boundary would be stripped from), the 201 answer is shape-
 * checked, and every refusal the contract declares (401/403/404/413/415/422)
 * is classified - with an empty shift id refused before any request is made.
 */
describe('the spreadsheet import (queue 4e)', () => {
  /** A fetch that records the raw body, so a FormData is not JSON.parsed. */
  function aRawFetch(answers: Answer[]): { impl: typeof fetch; calls: { url: string; init: RequestInit }[] } {
    const calls: { url: string; init: RequestInit }[] = [];
    let index = 0;
    const impl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const answer = answers[Math.min(index, answers.length - 1)];
      index += 1;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init: init ?? {} });
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

  const anImportAnswer = {
    shift_id: 'shift-1',
    imported: 2,
    stop_ids: ['stop-9', 'stop-10'],
    ignored_columns: ['notes'],
  };

  const aFile = { name: 'stops.csv', type: 'text/csv', uri: 'file:///cache/stops-import.csv' };

  it('posts the file as one multipart part, with no Content-Type the boundary would be stripped from', async () => {
    const { impl, calls } = aRawFetch([{ status: 201, body: anImportAnswer }]);
    // The part is captured at append: React Native's FormData keeps the
    // {uri, name, type} triple as the file part on device, while the test
    // environment's FormData stringifies it - so the triple itself is what
    // is asserted, at the seam it crosses.
    const appended: [string, unknown][] = [];
    const appendSpy = jest.spyOn(FormData.prototype, 'append').mockImplementation((name, value) => {
      appended.push([name, value]);
    });

    try {
      const outcome = await aClient(impl).importStops('shift-1', aFile);

      expect(outcome.status).toBe('ok');
      expect(calls[0]?.url).toBe('http://api.test/shifts/shift-1/import');
      expect(calls[0]?.init.method).toBe('POST');
      const headers = (calls[0]?.init.headers ?? {}) as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer token-1');
      expect(headers['Accept']).toBe('application/json');
      // The platform sets multipart's Content-Type WITH the boundary; setting
      // it here would send a bare "multipart/form-data" and the server could
      // not find the part.
      expect(headers['Content-Type']).toBeUndefined();
      const body = calls[0]?.init.body;
      expect(body).toBeInstanceOf(FormData);
      expect(appended).toEqual([
        ['file', { uri: aFile.uri, name: 'stops.csv', type: 'text/csv' }],
      ]);
    } finally {
      appendSpy.mockRestore();
    }
  });

  it('answers the 201 shape the contract declares', async () => {
    const { impl } = aRawFetch([{ status: 201, body: anImportAnswer }]);

    const outcome = await aClient(impl).importStops('shift-1', aFile);

    expect(outcome).toEqual({ status: 'ok', data: anImportAnswer });
  });

  it('refuses a 201 that is not the declared shape', async () => {
    const { impl } = aRawFetch([{ status: 201, body: { shift_id: 'shift-1', imported: 'two' } }]);

    const outcome = await aClient(impl).importStops('shift-1', aFile);

    expect(outcome.status).toBe('server');
    if (outcome.status === 'server') {
      expect(outcome.code).toBe(201);
    }
  });

  it('reads the contract\u2019s refusals exactly as declared: 413, 415 and 422 with the server\u2019s own sentence', async () => {
    for (const [code, message] of [
      [413, 'the file is over the 5 MiB cap'],
      [415, 'the name and the bytes disagree'],
      [422, 'row 4 has no address - nothing was stored'],
    ] as const) {
      const { impl } = aRawFetch([{ status: code, body: { message } }]);

      const outcome = await aClient(impl).importStops('shift-1', aFile);

      expect(outcome).toEqual({ status: 'server', code, message });
    }
  });

  it('reads 404 as the server\u2019s own answer about the shift', async () => {
    const { impl } = aRawFetch([{ status: 404, body: { message: 'no such shift' } }]);

    const outcome = await aClient(impl).importStops('shift-1', aFile);

    expect(outcome).toEqual({ status: 'server', code: 404, message: 'no such shift' });
  });

  it('classifies 401 and 403 as unauthorized', async () => {
    for (const code of [401, 403]) {
      const { impl } = aRawFetch([{ status: code, body: { message: 'no session' } }]);

      const outcome = await aClient(impl).importStops('shift-1', aFile);

      expect(outcome).toEqual({ status: 'unauthorized' });
    }
  });

  it('classifies a gone network as offline', async () => {
    const { impl } = aRawFetch([{ networkError: new Error('radio off') }]);

    const outcome = await aClient(impl).importStops('shift-1', aFile);

    expect(outcome).toEqual({ status: 'offline' });
  });

  it('refuses an empty shift id before any request is made (BUG-189\u2019s rule)', async () => {
    const { impl, calls } = aRawFetch([{ status: 201, body: anImportAnswer }]);

    const outcome = await aClient(impl).importStops('   ', aFile);

    expect(outcome.status).toBe('refused');
    expect(calls.length).toBe(0);
  });

  it('escapes the shift id so it cannot move the request', async () => {
    const { impl, calls } = aRawFetch([{ status: 201, body: anImportAnswer }]);

    await aClient(impl).importStops('shift 1/other', aFile);

    expect(calls[0]?.url).toBe('http://api.test/shifts/shift%201%2Fother/import');
  });
});

/**
 * Queue 4f (the trial's #16, the POD endpoint's app half): the proof-of-
 * delivery photo, `POST /runs/{run_id}/stops/{stop_id}/pod` with the image as
 * one multipart part and the event's own facts beside it.
 *
 * The upload is idempotent on the client's own event id (a replay answers
 * 200 with the first upload's answer), so this boundary's own contract is
 * exact: the parts are appended in the contract's names, no Content-Type is
 * set (the platform sets the boundary), 200 and 201 both answer the shape-
 * checked `PodResponse`, every refusal the contract declares (404/413/415)
 * rides through as the server's own code and sentence - and a call without
 * the run's or the stop's own id is refused before any request is made
 * (BUG-189's rule).
 */
describe('the POD photo upload (queue 4f)', () => {
  /** Captures the FormData's appends: the parts as the platform receives them. */
  function captureAppends(): { appended: [string, unknown][]; restore: () => void } {
    const appended: [string, unknown][] = [];
    const spy = jest.spyOn(FormData.prototype, 'append').mockImplementation((name, value) => {
      appended.push([name, value]);
    });
    return { appended, restore: () => spy.mockRestore() };
  }

  const aPodAnswer = {
    event_id: '33333333-3333-4333-8333-333333333333',
    stop_id: 'stop-2',
    sha256: 'ab'.repeat(32),
    bytes: 67,
    stored_at: '2026-10-31T08:15:00.000Z',
    already_stored: false,
  };

  const anImage = { uri: 'file:///cache/pod-photo.jpg', name: 'pod-photo.jpg', type: 'image/jpeg' };
  const aPayload = {
    image: anImage,
    occurredAt: '2026-10-31T08:14:59.000Z',
    eventId: '33333333-3333-4333-8333-333333333333',
  };

  it('posts the image, the moment and the event id as multipart parts, with no Content-Type the boundary would be stripped from', async () => {
    const { impl, calls } = aRawFetch([{ status: 201, body: aPodAnswer }]);
    const { appended, restore } = captureAppends();
    try {
      const outcome = await aClient(impl).uploadPod('run-1', 'stop-2', aPayload);

      expect(outcome.status).toBe('ok');
      expect(calls[0]?.url).toBe('http://api.test/runs/run-1/stops/stop-2/pod');
      expect(calls[0]?.init.method).toBe('POST');
      const headers = (calls[0]?.init.headers ?? {}) as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer token-1');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Content-Type']).toBeUndefined();
      expect(calls[0]?.init.body).toBeInstanceOf(FormData);
      expect(appended).toEqual([
        ['image', { uri: anImage.uri, name: 'pod-photo.jpg', type: 'image/jpeg' }],
        ['occurred_at', '2026-10-31T08:14:59.000Z'],
        ['event_id', '33333333-3333-4333-8333-333333333333'],
      ]);
    } finally {
      restore();
    }
  });

  it('adds the safe place as its own part only when the courier said one', async () => {
    const { impl } = aRawFetch([{ status: 201, body: aPodAnswer }]);
    const withPlace = captureAppends();
    try {
      await aClient(impl).uploadPod('run-1', 'stop-2', { ...aPayload, safePlace: 'behind the gate' });
      expect(withPlace.appended).toEqual([
        ['image', { uri: anImage.uri, name: 'pod-photo.jpg', type: 'image/jpeg' }],
        ['occurred_at', '2026-10-31T08:14:59.000Z'],
        ['event_id', '33333333-3333-4333-8333-333333333333'],
        ['safe_place', 'behind the gate'],
      ]);
    } finally {
      withPlace.restore();
    }

    const { impl: impl2 } = aRawFetch([{ status: 201, body: aPodAnswer }]);
    const withoutPlace = captureAppends();
    try {
      await aClient(impl2).uploadPod('run-1', 'stop-2', { ...aPayload, safePlace: '   ' });
      // An empty safe place is not a part: the contract's field is optional,
      // and a whitespace-only one would be stored as if said.
      expect(withoutPlace.appended.filter(([name]) => name === 'safe_place')).toEqual([]);
    } finally {
      withoutPlace.restore();
    }
  });

  it('answers both the 201 (stored) and the 200 (a replay of the same event id) as the declared shape', async () => {
    for (const status of [201, 200]) {
      const { impl } = aRawFetch([{ status, body: aPodAnswer }]);

      const outcome = await aClient(impl).uploadPod('run-1', 'stop-2', aPayload);

      expect(outcome).toEqual({ status: 'ok', data: aPodAnswer });
    }
  });

  it('refuses a 200/201 that is not the declared shape', async () => {
    const { impl } = aRawFetch([{ status: 201, body: { event_id: aPodAnswer.event_id, stop_id: 'stop-2' } }]);

    const outcome = await aClient(impl).uploadPod('run-1', 'stop-2', aPayload);

    expect(outcome.status).toBe('server');
    if (outcome.status === 'server') {
      expect(outcome.code).toBe(201);
    }
  });

  it('reads the contract\u2019s refusals exactly as declared: 413, 415 and 404 with the server\u2019s own sentence', async () => {
    for (const [code, message] of [
      [413, 'the image is over the 10 MiB cap'],
      [415, 'the bytes are not a JPEG, PNG or HEIC image'],
      [404, 'no such stop on this run'],
    ] as const) {
      const { impl } = aRawFetch([{ status: code, body: { message } }]);

      const outcome = await aClient(impl).uploadPod('run-1', 'stop-2', aPayload);

      expect(outcome).toEqual({ status: 'server', code, message });
    }
  });

  it('classifies 401 and 403 as unauthorized', async () => {
    for (const code of [401, 403]) {
      const { impl } = aRawFetch([{ status: code, body: { message: 'no session' } }]);

      const outcome = await aClient(impl).uploadPod('run-1', 'stop-2', aPayload);

      expect(outcome).toEqual({ status: 'unauthorized' });
    }
  });

  it('classifies a gone network as offline', async () => {
    const { impl } = aRawFetch([{ networkError: new Error('radio off') }]);

    const outcome = await aClient(impl).uploadPod('run-1', 'stop-2', aPayload);

    expect(outcome).toEqual({ status: 'offline' });
  });

  it('refuses an empty run or stop id before any request is made (BUG-189\u2019s rule)', async () => {
    const { impl, calls } = aRawFetch([{ status: 201, body: aPodAnswer }]);

    const noRun = await aClient(impl).uploadPod('  ', 'stop-2', aPayload);
    const noStop = await aClient(impl).uploadPod('run-1', '', aPayload);

    expect(noRun.status).toBe('refused');
    expect(noStop.status).toBe('refused');
    expect(calls.length).toBe(0);
  });

  it('escapes the run and stop ids so they cannot move the request', async () => {
    const { impl, calls } = aRawFetch([{ status: 201, body: aPodAnswer }]);

    await aClient(impl).uploadPod('run 1/x', 'stop 2/y', aPayload);

    expect(calls[0]?.url).toBe('http://api.test/runs/run%201%2Fx/stops/stop%202%2Fy/pod');
  });
});
