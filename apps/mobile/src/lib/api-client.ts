/**
 * The app's one HTTP boundary to the Courier API.
 *
 * The audit's first finding (A1) named the gap exactly: the app the founder
 * would install today shows mock data, because nothing in it speaks to the
 * server. This module is that boundary, typed by the contract the server is
 * checked against (`packages/shared/src/generated/api.ts`, regenerated from
 * `packages/contracts/openapi.yaml` by the drift guard), so a server change
 * that is not in the contract cannot reach the app.
 *
 * It answers with a typed outcome, never a raw rejection: every answer the
 * contract can give (200, 401, 404, 5xx, a broken body, no network at all)
 * has its own arm, which is what a screen and the sync engine read to decide
 * what the courier is told.
 */
import type {
  DemoRun,
  ImportResponse,
  RunResponse,
  StopResponse,
  ReoptResponse,
  SyncResponse,
} from '@courier/shared/src/generated/api';

import { sessionToken } from '@/lib/auth-client';
import type { DeliveryEvent } from '@/sync/types';
import { toContractEvent } from '@/lib/api-events';

/** Where the API lives when the build configures nothing. */
export const DEFAULT_API_BASE_URL = 'http://localhost:8000';

/**
 * The base URL the build gives us, or the local default.
 *
 * `EXPO_PUBLIC_*` is inlined by babel-preset-expo while the bundle is built,
 * so it is read once at module scope, the same way the app's other build
 * configs are read - a runtime lookup would always see undefined.
 */
export function getApiBaseUrl(fromBuild: string | undefined): string {
  const value = (fromBuild ?? '').trim();
  return value.length > 0 ? value : DEFAULT_API_BASE_URL;
}

/** What a call to the API answered with. */
export type ApiOutcome<TData> =
  | { status: 'ok'; data: TData }
  /** The session is gone, so no request was made (or the server refused it). */
  | { status: 'unauthorized' }
  /** The network is gone, or the call outran its timeout. */
  | { status: 'offline' }
  /** The server answered, and it was not the API's own answer. */
  | { status: 'server'; code: number; message: string }
  /** An event the contract has no kind for, so no request was made. */
  | { status: 'unmappable'; message: string }
  /**
   * The client refused to make the call, so the server was never asked
   * (BUG-189: a request built without the run's own id is a request about no
   * run at all). This is a defect in the caller, not an answer from anywhere.
   */
  | { status: 'refused'; message: string };

/** How the client is built: the seams the tests inject. */
export interface CourierApiClientOptions {
  baseUrl?: string;
  /** The token the request carries. The app's session, by default. */
  getToken?: () => Promise<string | null>;
  /** The fetch implementation. The platform's, by default. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Milliseconds a request may take before it is treated as offline. */
const DEFAULT_TIMEOUT_MS = 15_000;

const NOT_JSON = 'the API answered 200 with a body that was not JSON';

export class CourierApiClient {
  private readonly baseUrl: string;

  private readonly getToken: () => Promise<string | null>;

  private readonly fetchImpl: typeof fetch;

  private readonly timeoutMs: number;

  constructor(options: CourierApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
    this.getToken = options.getToken ?? (() => sessionToken());
    this.fetchImpl =
      options.fetchImpl ??
      ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init ?? {}));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** The seeded day: `POST /demo/runs`. */
  async seedDemoRun(reason?: 'e2e' | 'demo' | 'dev'): Promise<ApiOutcome<DemoRun>> {
    return this.request<DemoRun>('/demo/runs', {
      method: 'POST',
      body: reason === undefined ? {} : { reason },
    });
  }

  /** The run: `GET /runs/{run_id}`. */
  async getRun(runId: string): Promise<ApiOutcome<RunResponse>> {
    return this.request<RunResponse>(`/runs/${this.escape(runId)}`, { method: 'GET' }, isRun);
  }

  /** The stops of a shift: `GET /shifts/{shift_id}/stops`. */
  async getStops(
    shiftId: string,
    options: { status?: StopResponse['status'] } = {},
  ): Promise<ApiOutcome<StopResponse[]>> {
    const query =
      options.status === undefined
        ? ''
        : `?status=${encodeURIComponent(options.status)}`;
    return this.request<StopResponse[]>(
      `/shifts/${this.escape(shiftId)}/stops${query}`,
      { method: 'GET' },
      isStopList,
    );
  }

  /**
   * Re-places the affected stops with the server's solver:
   * `POST /runs/{run_id}/route:reopt` (the trial's queue 4.2).
   *
   * The courier asks for the stops they touched, and the server answers with
   * the day's new order and the finish-time delta - the phone never invents an
   * order of its own, and the answer is the server's.
   *
   * BUG-189: the run's own id comes first, and a call without it is refused
   * here rather than dialed as `/runs//route:reopt` - a URL that is about no
   * run, and whose 404 a courier would read as the run having gone missing.
   */
  async reoptRoute(
    runId: string,
    affectedStopIds: readonly string[],
  ): Promise<ApiOutcome<ReoptResponse>> {
    const run = runId.trim();
    if (run.length === 0) {
      return { status: 'refused', message: 'the reopt needs the run\'s own id, and none was given' };
    }
    return this.request<ReoptResponse>(
      `/runs/${this.escape(run)}/route:reopt`,
      { method: 'POST', body: { affected_stop_ids: [...affectedStopIds] } },
      isReopt,
    );
  }

  /**
   * The spreadsheet import: `POST /shifts/{shift_id}/import` with the file as
   * the one multipart part (queue 4e, the trial's #6, ADR-025's app half).
   *
   * The import is all-or-nothing on the server, so this call never invents an
   * answer: the 201 is shape-checked against the contract, and every refusal
   * the contract declares (404/413/415/422) rides through as the server's own
   * code and sentence. Like the reopt (BUG-189), the shift's own id comes
   * first, and a call without it is refused here rather than dialed as
   * `/shifts//import` - a URL about no shift at all.
   */
  async importStops(
    shiftId: string,
    file: { name: string; type?: string; uri: string },
  ): Promise<ApiOutcome<ImportResponse>> {
    const shift = shiftId.trim();
    if (shift.length === 0) {
      return { status: 'refused', message: "the import needs the shift's own id, and none was given" };
    }
    const form = new FormData();
    // React Native's FormData takes the file as a {uri, name, type} triple and
    // turns it into the multipart part itself, setting the boundary on the
    // Content-Type - which is why the request below sends no Content-Type.
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type ?? 'application/octet-stream',
    } as unknown as Blob);
    return this.request<ImportResponse>(`/shifts/${this.escape(shift)}/import`, { method: 'POST', form }, isImport);
  }

  /** The outbox: `POST /shifts/{shift_id}/events:batch`. */
  async postDeliveryEvents(
    shiftId: string,
    events: DeliveryEvent[],
  ): Promise<ApiOutcome<SyncResponse>> {
    const body: unknown[] = [];
    for (const event of events) {
      const mapping = toContractEvent(event);
      if (mapping.status === 'unmappable') {
        return { status: 'unmappable', message: mapping.reason };
      }
      body.push(mapping.event);
    }

    return this.request<SyncResponse>(`/shifts/${this.escape(shiftId)}/events:batch`, {
      method: 'POST',
      body,
    });
  }

  /** One segment of a path, escaped so an id cannot move the request. */
  private escape(segment: string): string {
    return encodeURIComponent(segment);
  }

  private async request<TData>(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown; form?: FormData },
    shape?: (data: unknown) => boolean,
  ): Promise<ApiOutcome<TData>> {
    const token = await this.getToken();
    if (typeof token !== 'string' || token.trim().length === 0) {
      return { status: 'unauthorized' };
    }

    const hasBody = options.body !== undefined;
    const hasForm = options.form !== undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.join(path)}`, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          // A JSON body declares itself. A multipart body does NOT: the
          // platform sets the Content-Type with the boundary, and a header
          // set here would strip it and leave the server no part to read.
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(hasForm
          ? { body: options.form }
          : hasBody
            ? { body: JSON.stringify(options.body) }
            : {}),
        signal: controller.signal,
      });
    } catch {
      // The radio is off, the DNS failed, or the timeout fired: the phone
      // keeps its own copy of the day and tries again later.
      return { status: 'offline' };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthorized' };
    }

    if (!response.ok) {
      return { status: 'server', code: response.status, message: await this.failure(response) };
    }

    let data: unknown;
    try {
      data = (await response.json()) as unknown;
    } catch {
      return { status: 'server', code: response.status, message: NOT_JSON };
    }

    if (shape !== undefined && !shape(data)) {
      return {
        status: 'server',
        code: response.status,
        message: `the 200 answer of ${path} was not the shape the contract declares`,
      };
    }

    return { status: 'ok', data: data as TData };
  }

  /** The sentence the server sent with its failure. */
  private async failure(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: unknown; error?: unknown };
      if (typeof body?.message === 'string' && body.message.length > 0) {
        return body.message;
      }
      if (typeof body?.error === 'string' && body.error.length > 0) {
        return body.error;
      }
    } catch {
      // The failure had no JSON body either.
    }
    return `the API answered ${response.status}`;
  }

  /** One slash between the base URL and the path, whatever either ends with. */
  private join(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }
}

/** A run the contract declares: at least the id the app navigates by. */
function isRun(data: unknown): boolean {
  return typeof (data as RunResponse | undefined)?.id === 'string';
}

/** The stops the contract declares: a list. */
function isStopList(data: unknown): boolean {
  return Array.isArray(data);
}

/**
 * The import answer the contract declares (`ImportResponse`): the shift it
 * landed on, how many stops, their ids in file order, and the columns that
 * matched no known field - answered, never dropped silently (ADR-025).
 */
function isImport(data: unknown): boolean {
  const body = data as Partial<ImportResponse> | undefined;
  return (
    typeof body?.shift_id === 'string' &&
    typeof body?.imported === 'number' &&
    Array.isArray(body?.stop_ids) &&
    body.stop_ids.every((id: unknown) => typeof id === 'string') &&
    Array.isArray(body?.ignored_columns) &&
    body.ignored_columns.every((column: unknown) => typeof column === 'string')
  );
}

/**
 * The reopt answer the contract declares.
 *
 * `finish_delta_s` is a float on the server - a fraction of a second is a
 * legal answer - so any finite number is the contract's own, and only a
 * non-number (a word, null, a missing field) is refused. The stops are the
 * solver's own order: each a stop_id the run knows and a sequence, because
 * that order is what the phone has to apply to the run it holds.
 */
function isReopt(data: unknown): boolean {
  const body = data as Partial<ReoptResponse> | undefined;
  if (typeof body?.run_id !== 'string' || body.run_id.length === 0) {
    return false;
  }
  if (typeof body?.engine !== 'string') {
    return false;
  }
  if (typeof body?.finish_delta_s !== 'number' || !Number.isFinite(body.finish_delta_s)) {
    return false;
  }
  if (!Array.isArray(body?.stops)) {
    return false;
  }
  return body.stops.every((stop: unknown) => {
    const entry = stop as Record<string, unknown> | undefined;
    return typeof entry?.stop_id === 'string' && typeof entry?.sequence === 'number';
  });
}
