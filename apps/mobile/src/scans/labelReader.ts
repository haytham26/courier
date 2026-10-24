/**
 * The label reader: the seam between the camera and the run.
 *
 * What the reference shows (06-scan.html) is a courier pointing the camera
 * at a parcel label and the app reading the address off it: the lock ring
 * around the address block, "Address found. Hold steady.", and the sheet
 * with the matched address. The READING is the part the platforms disagree
 * on: react-native-vision-camera 5.2.3 ships its object scanner
 * (`useObjectOutput`) on iOS only (its `CameraObjectOutput` is marked
 * `@platform iOS`), and Android needs an ML Kit text-recognition plugin - a
 * native dependency and its own slice. So the reader is a seam with two
 * honest implementations:
 *
 * - the mock reader: the E2E build (and the dev build) reads the mock run's
 *   labels, so the screen's choreography can be driven end to end;
 * - the camera reader: a device build without the Android recognizer says
 *   it cannot read a label, instead of pretending it did.
 *
 * The seam is the contract: the screen asks a reader for a reading and
 * renders what comes back. A new recognizer (the Android ML Kit slice) is a
 * new implementation of this interface and nothing else changes.
 */
import { mockStops } from '@/maps/stops';

/** What a label carries that the run can use: the address and its suburb. */
export interface LabelMatch {
  address: string;
  suburb: string;
}

/** The three things a reader can say. */
export type LabelReading =
  /** A label was read and it matched an address. */
  | { kind: 'found'; match: LabelMatch }
  /** Nothing was read (no label in the frame). */
  | { kind: 'none' }
  /** This build cannot read labels at all, and says why. */
  | { kind: 'unavailable'; reason: string };

export interface LabelReader {
  read(): Promise<LabelReading>;
}

/** The beat the mock reader takes before it answers (the camera takes its own). */
export const MOCK_READ_BEAT_MS = 900;

/**
 * The mock reader: it walks the labels it was given, one per read, and comes
 * back to the first one when the run of them is over.
 */
export const createMockLabelReader = (labels: LabelMatch[], beatMs = MOCK_READ_BEAT_MS): LabelReader => {
  let cursor = 0;
  return {
    read: async () => {
      if (beatMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, beatMs);
        });
      }
      const label = labels[cursor % labels.length];
      cursor += 1;
      if (!label) {
        return { kind: 'none' };
      }
      return { kind: 'found', match: label };
    },
  };
};

/**
 * The camera reader: the truth on a build without the Android recognizer.
 * The reason names the platform, so nobody reads it as a broken camera.
 */
export const createCameraLabelReader = (): LabelReader => ({
  read: () =>
    Promise.resolve({
      kind: 'unavailable',
      reason:
        'Reading a parcel label needs the Android text recognizer, which lands with the scanner slice (the camera library ships its own scanner on iOS only).',
    }),
});

/** The labels of the mock run: the stops that are still to do. */
export const mockRunLabels = (): LabelMatch[] =>
  mockStops
    .filter((stop) => stop.status !== 'delivered')
    .map((stop) => ({ address: stop.address, suburb: stop.suburb }));

/**
 * The reader of this build: the mock in the E2E build (the app's own "local
 * mocks, no Metro" contract), the camera reader everywhere else.
 */
export const readerForThisBuild = (): LabelReader =>
  process.env.EXPO_PUBLIC_E2E === '1'
    ? createMockLabelReader(mockRunLabels(), MOCK_READ_BEAT_MS)
    : createCameraLabelReader();
