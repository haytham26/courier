/**
 * The loopback stack the scale harness drives the app's own sync path against
 * (test support, never imported by product code — the same posture as
 * `src/voice/testing/`).
 *
 * The founder directive 2026-11-10, item 5 asks for a KILL mid-delivery and
 * mid-sync, proven by exactly-once sync. That proof needs a server that
 * answers the way the real one does — `POST /shifts/{id}/events:batch`
 * answering the contract's `{accepted, cursor, conflicts}`, and storing each
 * event ONCE by its client-generated id (the API's own `ON CONFLICT (id) DO
 * NOTHING`) — and that can die at the worst moment: after it has stored the
 * batch and before it has answered.
 *
 * The client the harness hands the transport is the app's OWN
 * `CourierApiClient`, with the platform seam injected: `fetchImpl` speaks
 * node's http to this server, because a jest run has no React Native
 * networking. Everything above that seam — the URL, the bearer token, the
 * JSON body, the shape check, the outcome mapping, the transport's refusal
 * logic and the sync service's confirm-after-store — is the app's own.
 */
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

import type { SyncResult } from '@/sync/types';

/** One event as the server stored it. */
export interface StoredEvent {
  id: string;
  stop_id: string;
  kind: string;
  reason?: string;
  utterance?: string;
  occurred_at: string;
}

/** What the server saw, so a test can assert exactly-once from its side. */
export interface ServerRecord {
  /** Every event the server STORED, in first-store order (one per id). */
  readonly stored: StoredEvent[];
  /** Every event row the client SENT, replays included. */
  readonly sent: StoredEvent[];
  /** The batches that arrived, and how each was answered. */
  readonly batches: { events: number; accepted: number; outcome: 'answered' | 'died' }[];
  /** The health checks the harness made. */
  readonly pings: number;
}

/** How the next batch is answered: the contract's own, or the kill. */
export type ServerMode = 'answer' | 'die-before-answer' | 'partial-accept';

export class ScaleServer {
  private readonly server: Server;

  private readonly stored = new Map<string, StoredEvent>();

  private readonly sent: StoredEvent[] = [];

  private readonly batches: { events: number; accepted: number; outcome: 'answered' | 'died' }[] =
    [];

  private mode: ServerMode = 'answer';

  private pings = 0;

  constructor() {
    this.server = createServer((request, response) => {
      void this.answer(request, response);
    });
  }

  /** Listens on the loopback, and answers from then on. */
  async start(): Promise<string> {
    await new Promise<void>((resolve) => {
      this.server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = this.server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    return `http://127.0.0.1:${String(port)}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }

  /** The kill switch: the next batch is stored, and the answer never arrives. */
  setMode(mode: ServerMode): void {
    this.mode = mode;
  }

  /** What the server saw, for the assertions. */
  record(): ServerRecord {
    return {
      stored: [...this.stored.values()],
      sent: [...this.sent],
      batches: [...this.batches],
      pings: this.pings,
    };
  }

  /** The row as the server stored it, by its event id. */
  storedOf(id: string): StoredEvent | undefined {
    return this.stored.get(id);
  }

  private async answer(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = request.url ?? '';
    if (request.method === 'GET' && url.startsWith('/healthz')) {
      this.pings += 1;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    const batch = /^\/shifts\/([^/]+)\/events:batch$/.exec(url);
    if (request.method === 'POST' && batch !== null) {
      const body = await theBody(request);
      // The contract's own request body: an ARRAY of the contract's
      // DeliveryEvent (`openapi.yaml`, `/shifts/{shift_id}/events:batch`).
      const events = (JSON.parse(body) as StoredEvent[]) ?? [];
      const mode = this.mode;
      for (const event of events) {
        this.sent.push(event);
        // The API's own rule: the id is the phone's, so a replay stores once.
        if (!this.stored.has(event.id)) {
          this.stored.set(event.id, event);
        }
      }
      this.batches.push({
        events: events.length,
        accepted: events.length,
        outcome: mode === 'die-before-answer' ? 'died' : 'answered',
      });

      if (mode === 'die-before-answer') {
        // The process is killed after the store and before the answer: the
        // socket is torn down, which is what the phone reads as "nobody
        // answered" — the transport's throw, never a refusal.
        response.socket?.destroy();
        return;
      }
      const answer: SyncResult = {
        accepted: mode === 'partial-accept' ? Math.floor(events.length / 2) : events.length,
        cursor: this.stored.size,
        conflicts: [],
      };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(answer));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: `the scale stack answers no ${url}` }));
  }
}

/** The request body, read whole. */
function theBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/** What the app's own client reads an answer through. */
export interface WireAnswer {
  status: number;
  ok: boolean;
  /** The response headers, for the callers that need one (the session cookie). */
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

/**
 * The platform seam the app's client takes, speaking node's http: the jest
 * environment has no React Native networking, and the point of the harness is
 * the app's own path above this line, not the runtime's fetch.
 */
export function theFetchOf(
  baseUrl: string,
): (input: string, init?: RequestInit) => Promise<WireAnswer> {
  return (input: string, init: RequestInit = {}) =>
    new Promise<WireAnswer>((resolve, reject) => {
      const target = new URL(input, baseUrl);
      const headers = (init.headers ?? {}) as Record<string, string>;
      // A Buffer body is written as it is: the POD multipart’s image part.
      const body: string | Buffer | undefined =
        typeof init.body === 'string'
          ? init.body
          : Buffer.isBuffer(init.body)
            ? init.body
            : undefined;
      const pending = httpRequest(
        {
          hostname: target.hostname,
          port: target.port,
          path: `${target.pathname}${target.search}`,
          method: init.method ?? 'GET',
          headers,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            const status = response.statusCode ?? 0;
            resolve({
              status,
              ok: status >= 200 && status < 300,
              headers: {
                // Node answers a set-cookie as a list; the platform’s own
                // Headers answers one value or a list, and the caller joins them.
                get: (name: string) => {
                  const value = response.headers[String(name).toLowerCase()];
                  return Array.isArray(value) ? value.join('; ') : (value ?? null);
                },
              },
              json: () => Promise.resolve(text.length > 0 ? (JSON.parse(text) as unknown) : null),
            });
          });
        },
      );
      pending.on('error', reject);
      if (body !== undefined) {
        pending.write(body);
      }
      pending.end();
    });
}
