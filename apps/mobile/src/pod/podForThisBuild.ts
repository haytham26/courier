/**
 * The proof-of-delivery photo of this build (queue 4f, the trial's #16,
 * ADR-010's app half).
 *
 * The E2E build has no camera wired to a store and no API (local mocks, no
 * Metro), so this is the same seam the scanner's `readerForThisBuild` and the
 * run's `dayForThisBuild` already use: in the E2E build the capture writes
 * the canned 1x1 JPEG to the cache (a real JPEG's magic bytes, FFD8FF, so the
 * server's sniff would pass it) and answers its file, and the uploader
 * answers the canned `PodResponse`. In every other build the capture says it
 * is unavailable - the Scan camera slice is P5, step 06, and the honest
 * answer names it, the labelReader posture, never a pretended photo - and the
 * one upload path is the real client's `uploadPod` and no other.
 */
import { File, Paths } from 'expo-file-system';

import type { PodResponse } from '@courier/shared/src/generated/api';

import { CourierApiClient, type ApiOutcome } from '@/lib/api-client';

/** The captured photo, as the multipart part is built from it. */
export interface PodImage {
  uri: string;
  name: string;
  type: string;
}

/** What the capture answered. */
export type PodCaptureResult =
  | { kind: 'photo'; image: PodImage }
  | { kind: 'unavailable'; reason: string };

/** The capture: the phone takes the proof photo. */
export interface PodCapture {
  capture(): Promise<PodCaptureResult>;
}

/** The upload's own payload: the image and the event's own facts. */
export interface PodUploadPayload {
  image: PodImage;
  /** The delivery's own moment, ISO 8601. */
  occurredAt: string;
  /** The client-generated uuid; a replay of it answers 200 with the first store. */
  eventId: string;
  /** The spoken safe place, when the courier said one (BUG-073's leg). */
  safePlace?: string;
}

/** The uploader: one photo into one stop of one run. */
export interface PodUploader {
  uploadPod(
    runId: string,
    stopId: string,
    payload: PodUploadPayload,
  ): Promise<ApiOutcome<PodResponse>>;
}

/** The cache file the canned photo is written under. */
const POD_FILE_NAME = 'pod-photo.jpg';

/**
 * The canned photo's bytes, base64: a 1x1 JPEG, so the file carries the real
 * magic (FFD8FF) the server sniffs - checked by bytes, not by name.
 */
/**
 * The canned photo's bytes, base64: a 1x1 JPEG, so the file carries the real
 * magic (FFD8FF) the server sniffs - checked by bytes, not by name. The string
 * is a whole, valid base64 (380 chars, a multiple of 4): run 42171314486's
 * api-34 leg answered "bad base-64" from Android's decoder when the first
 * hand-truncated copy was written, and the capture answered the error note.
 */
/**
 * The canned photo's bytes, base64: a 1x1 JPEG, so the file carries the real
 * magic (FFD8FF) the server sniffs - checked by bytes, not by name. The string
 * is a whole, valid base64 (380 chars, a multiple of 4, decoding to 284 bytes
 * FFD8FF..FFD9): run 42171314486's api-34 leg answered "bad base-64" from
 * Android's decoder when a hand-truncated copy was written, and the capture
 * answered the error note instead of the stored one.
 */
const CANNED_POD_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AvwA//9k=';

/** The canned photo's own size, in bytes (what the decoded base64 holds). */
const CANNED_POD_BYTES = 284;

/** The canned store's own fingerprint (the seam answers a stable one). */
const CANNED_POD_SHA256 = 'ab'.repeat(32);

/**
 * The E2E build's capture: writes the canned JPEG to the app's cache and
 * answers the file the multipart part is built from. The cache is the app's
 * own scratch space, the same one the pasted spreadsheet lands in.
 */
async function writeCannedPodPhoto(): Promise<PodImage> {
  const file = new File(Paths.cache, POD_FILE_NAME);
  file.create({ intermediates: true, overwrite: true });
  await file.write(CANNED_POD_JPEG_BASE64, { encoding: 'base64' });
  return { uri: file.uri, name: POD_FILE_NAME, type: 'image/jpeg' };
}

function createMockPodCapture(): PodCapture {
  return {
    capture: () => writeCannedPodPhoto().then((image) => ({ kind: 'photo' as const, image })),
  };
}

/** The release build's capture: says so, naming the slice that will wire it. */
function createUnavailablePodCapture(): PodCapture {
  return {
    capture: () =>
      Promise.resolve({
        kind: 'unavailable' as const,
        reason:
          'Taking the proof photo needs the Scan camera wired to a store (P5, step 06); this build says so instead of pretending.',
      }),
  };
}

/** The capture of this build: the canned photo in the E2E build, the honest "no" everywhere else. */
export const captureForThisBuild = (): PodCapture =>
  process.env.EXPO_PUBLIC_E2E === '1' ? createMockPodCapture() : createUnavailablePodCapture();

/** The app's one HTTP boundary: the upload asks the server in every real build. */
const apiClient = new CourierApiClient();

/**
 * The E2E build's uploader: answers the canned `PodResponse`, echoing the
 * event's own ids back - which is what makes the replay semantics visible to
 * the flow: the answer says the photo was stored for this event and stop.
 */
function createMockPodUploader(): PodUploader {
  return {
    uploadPod: (runId, stopId, payload) =>
      Promise.resolve({
        status: 'ok' as const,
        data: {
          event_id: payload.eventId,
          stop_id: stopId,
          sha256: CANNED_POD_SHA256,
          bytes: CANNED_POD_BYTES,
          stored_at: '2026-10-31T08:15:00.000Z',
          already_stored: false,
        },
      }),
  };
}

/** The uploader of this build: the mock in the E2E build, the real client everywhere else. */
export const uploaderForThisBuild = (): PodUploader =>
  process.env.EXPO_PUBLIC_E2E === '1'
    ? createMockPodUploader()
    : {
        uploadPod: (runId, stopId, payload) => apiClient.uploadPod(runId, stopId, payload),
      };
