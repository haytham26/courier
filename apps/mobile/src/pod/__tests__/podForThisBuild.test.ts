/**
 * The proof-photo seam (queue 4f, the trial's #16): which capture and which
 * uploader this build answers with.
 *
 * The E2E build has no camera wired to a store and no API (local mocks, no
 * Metro), so - exactly the way the scanner's `readerForThisBuild` and the
 * run's `dayForThisBuild` work - the E2E build's capture writes the canned
 * 1x1 JPEG to the cache and answers its file, and its uploader answers the
 * canned `PodResponse`. Every other build's capture says it is unavailable
 * (the Scan camera slice is P5, step 06 - the labelReader posture: say so,
 * never pretend) and its one upload path is the real client's `uploadPod`
 * and no other.
 */
import type { PodResponse } from '@courier/shared/src/generated/api';

import type { ApiOutcome } from '@/lib/api-client';

const mockUploadPod = jest.fn(
  (
    _runId: string,
    _stopId: string,
    _payload: unknown,
  ): Promise<ApiOutcome<PodResponse>> =>
    Promise.resolve({
      status: 'ok',
      data: {
        event_id: 'e',
        stop_id: 's',
        sha256: 'ab'.repeat(32),
        bytes: 1,
        stored_at: '2026-10-31T08:15:00.000Z',
        already_stored: false,
      },
    }),
);

jest.mock('@/lib/api-client', () => ({
  CourierApiClient: jest.fn(() => ({ uploadPod: mockUploadPod })),
}));

const mockWritten: { name: string; text: string; options: unknown }[] = [];
const mockCreated: { name: string; options: unknown }[] = [];

jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' } },
  File: jest.fn((_dir: unknown, name: string) => ({
    uri: `file:///cache/${name}`,
    exists: true,
    create: (options: unknown) => {
      mockCreated.push({ name, options });
    },
    write: (text: string, options?: unknown) => {
      mockWritten.push({ name, text, options });
      return Promise.resolve();
    },
  })),
}));

const THE_PAYLOAD = {
  image: { uri: 'file:///cache/pod-photo.jpg', name: 'pod-photo.jpg', type: 'image/jpeg' },
  occurredAt: '2026-10-31T08:14:59.000Z',
  eventId: '33333333-3333-4333-8333-333333333333',
};

describe('the capture of this build (queue 4f)', () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
    mockWritten.length = 0;
    mockCreated.length = 0;
  });

  it('says it is unavailable in a release build, naming the slice that will wire it (the labelReader posture)', async () => {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../podForThisBuild')>('../podForThisBuild');

    const capture = await loaded.captureForThisBuild().capture();

    expect(capture.kind).toBe('unavailable');
    if (capture.kind === 'unavailable') {
      expect(capture.reason).toContain('P5');
    }
    // No file was written and no photo was pretended.
    expect(mockWritten).toEqual([]);
  });

  it('writes the canned JPEG to the cache and answers its file in the E2E build', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../podForThisBuild')>('../podForThisBuild');

    const capture = await loaded.captureForThisBuild().capture();

    expect(capture).toEqual({
      kind: 'photo',
      image: { uri: 'file:///cache/pod-photo.jpg', name: 'pod-photo.jpg', type: 'image/jpeg' },
    });
    // The canned bytes are a real JPEG's magic (FFD8FF), written as base64
    // the way the camera's file will be written.
    expect(mockCreated[0]).toEqual({ name: 'pod-photo.jpg', options: { intermediates: true, overwrite: true } });
    expect(mockWritten.length).toBe(1);
    expect(mockWritten[0]?.name).toBe('pod-photo.jpg');
    expect(mockWritten[0]?.options).toEqual({ encoding: 'base64' });
    const bytes = Buffer.from(mockWritten[0]?.text ?? '', 'base64');
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    expect(bytes[2]).toBe(0xff);
  });
});

describe('the uploader of this build (queue 4f)', () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
    mockUploadPod.mockClear();
  });

  it('is the real client\u2019s uploadPod in a release build', async () => {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../podForThisBuild')>('../podForThisBuild');
    mockUploadPod.mockResolvedValue({
      status: 'ok',
      data: {
        event_id: THE_PAYLOAD.eventId,
        stop_id: 'stop-2',
        sha256: 'cd'.repeat(32),
        bytes: 284,
        stored_at: '2026-10-31T08:15:00.000Z',
        already_stored: true,
      },
    });

    const outcome = await loaded
      .uploaderForThisBuild()
      .uploadPod('run-1', 'stop-2', THE_PAYLOAD);

    expect(mockUploadPod).toHaveBeenCalledWith('run-1', 'stop-2', THE_PAYLOAD);
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') {
      expect(outcome.data.already_stored).toBe(true);
    }
  });

  it('answers the canned PodResponse in the E2E build, echoing the event\u2019s own ids, without dialing anything', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../podForThisBuild')>('../podForThisBuild');

    const outcome = await loaded
      .uploaderForThisBuild()
      .uploadPod('run-e2e', 'stop-2', THE_PAYLOAD);

    expect(mockUploadPod).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      status: 'ok',
      data: {
        event_id: THE_PAYLOAD.eventId,
        stop_id: 'stop-2',
        sha256: 'ab'.repeat(32),
        bytes: 284,
        stored_at: '2026-10-31T08:15:00.000Z',
        already_stored: false,
      },
    });
  });
});
