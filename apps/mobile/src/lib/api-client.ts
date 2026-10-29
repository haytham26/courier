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
  RunResponse,
  StopResponse,
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
  | { status: 'unmappable'; message: string };

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
    options: { method: 'GET' | 'POST'; body?: unknown },
    shape?: (data: unknown) => boolean,
  ): Promise<ApiOutcome<TData>> {
    const token = await this.getToken();
    if (typeof token !== 'string' || token.trim().length === 0) {
      return { status: 'unauthorized' };
    }

    const hasBody = options.body !== undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.join(path)}`, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
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
