/**
 * The money of a shift, online and offline.
 *
 * When the phone has no network the app shows the last money it saw and says
 * that it is not up to date. It never shows a number it made up.
 */
import { HttpClient } from '@/api/httpClient';
import { MemoryKeyValueStore } from '@/sync/storage';
import { ApiEarningsService } from '../earningsService';

const EARNINGS = {
  currency: 'NZD',
  delivered: 41,
  failed: 3,
  skipped: 2,
  gross: '412.60',
  gst: '53.86',
  net: '358.74',
  rate: '1.50',
  breakdown: [{ stop_id: 'stop-1', amount: '1.70', kind: 'delivered' }],
};

const SUMMARY = {
  shift_id: 'shift-1',
  date: '2026-10-21',
  currency: 'NZD',
  delivered: 41,
  failed: 3,
  skipped: 2,
  gross: '412.60',
  gst: '53.86',
  net: '358.74',
  average_delivery_seconds: 214,
  success_rate: 0.9318,
  failed_stops: [
    { stop_id: 'stop-9', kind: 'failed_access', reason: 'No access', occurred_at: '2026-10-21T10:15:00Z' },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function makeService(fetchImpl: (url: string) => Promise<Response>) {
  const store = new MemoryKeyValueStore();
  const http = new HttpClient({ baseUrl: 'http://api.test', fetchImpl });
  return { service: new ApiEarningsService(http, store) };
}

describe('the earnings', () => {
  it('reads the money of a shift', async () => {
    const { service } = makeService(async () => jsonResponse(EARNINGS));

    const result = await service.get('shift-1');

    expect(result.value?.net).toBe('358.74');
    expect(result.value?.breakdown).toHaveLength(1);
    expect(result.isStale).toBe(false);
    expect(result.error).toBeNull();
  });

  it('shows the last money it had when the network is down', async () => {
    let online = true;
    const { service } = makeService(async () => {
      if (!online) {
        throw new TypeError('Network request failed');
      }
      return jsonResponse(EARNINGS);
    });

    await service.get('shift-1');
    online = false;
    const result = await service.get('shift-1');

    expect(result.value?.net).toBe('358.74');
    expect(result.isStale).toBe(true);
    expect(result.error).not.toBeNull();
    expect(result.updatedAt).not.toBeNull();
  });

  it('has no money to show when the server never answered', async () => {
    const { service } = makeService(async () => {
      throw new TypeError('Network request failed');
    });

    const result = await service.get('shift-1');

    expect(result.value).toBeNull();
    expect(result.isStale).toBe(true);
  });

  it('shows nothing for a shift that has no money on it yet', async () => {
    const { service } = makeService(async () => jsonResponse({ detail: 'Shift not found' }, 404));

    const result = await service.get('shift-1');

    expect(result.value).toBeNull();
    expect(result.isStale).toBe(false);
    expect(result.error).toBeNull();
  });

  it('reads the end-of-day summary', async () => {
    const { service } = makeService(async () => jsonResponse(SUMMARY));

    const result = await service.getSummary('shift-1');

    expect(result.value?.average_delivery_seconds).toBe(214);
    expect(result.value?.success_rate).toBeCloseTo(0.9318);
    expect(result.value?.failed_stops[0]?.reason).toBe('No access');
  });
});
