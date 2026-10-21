/**
 * The HTTP transport of the mobile app.
 *
 * Two kinds of failure, and the screens need to tell them apart: the server
 * answered (an `HttpError`, with its status) or the network did not
 * (`NetworkError`). The offline behaviour of the app hangs on that
 * difference: a server error can be retried, a dead network cannot.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  /** The bearer token of the signed-in courier, when there is one. */
  getToken?: () => Promise<string | null>;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function isResponse(value: unknown): value is Response {
  return typeof value === 'object' && value !== null && 'status' in value;
}

/** The plain-English sentence for a failed request. */
function messageForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return 'Please sign in again.';
  }
  if (status === 404) {
    return 'That record is not there.';
  }
  if (status >= 500) {
    return 'The server had a problem. Try again in a moment.';
  }
  return 'That request did not go through. Try again.';
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly getToken: () => Promise<string | null>;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getToken = options.getToken ?? (async () => null);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!isResponse(response)) {
        throw new NetworkError('No connection.');
      }

      if (!response.ok) {
        throw new HttpError(response.status, messageForStatus(response.status));
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (error instanceof NetworkError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('The network is not answering.');
      }
      throw new NetworkError('No connection.');
    } finally {
      clearTimeout(timer);
    }
  }
}
