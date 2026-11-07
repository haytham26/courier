/**
 * The recorder glue for the debug-build voice samples (audit A3 item 3):
 * record with `expo-audio`, keep the file and its manifest row in
 * `<documentDirectory>/voice-samples/`, delete on request.
 *
 * Nothing here throws at the caller: a recorder that cannot start, or a file
 * system that refuses, is an ANSWER (`refused` with the reason), because a
 * courier in a dead spot still gets the screen - the same rule the
 * preferences store keeps.
 */
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

import { firstLine } from '@/lib/firstLine';

import type { ConsentRecord } from './consent';
import {
  appendSample,
  newSampleId,
  parseSampleManifest,
  removeSample,
  type SampleManifest,
  type SampleRecord,
} from './sampleManifest';

/** The directory the samples and their manifest live in. */
export const SAMPLES_DIRECTORY_NAME = 'voice-samples';

/** The manifest file's name inside the samples directory. */
export const MANIFEST_FILE_NAME = 'manifest.json';

/** The directory the samples live in. */
export function samplesDirectory(): Directory {
  return new Directory(Paths.document, SAMPLES_DIRECTORY_NAME);
}

/** The manifest file. */
export function manifestFile(directory: Directory = samplesDirectory()): File {
  return new File(directory, MANIFEST_FILE_NAME);
}

/** Reads the manifest; a missing or unreadable file is the empty manifest. */
export async function readManifest(directory: Directory = samplesDirectory()): Promise<SampleManifest> {
  try {
    const file = manifestFile(directory);
    if (!file.exists) {
      return { consentedId: '', samples: [] };
    }
    return parseSampleManifest(await file.text());
  } catch {
    return { consentedId: '', samples: [] };
  }
}

async function writeManifest(manifest: SampleManifest, directory: Directory): Promise<void> {
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const file = manifestFile(directory);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  await file.write(JSON.stringify(manifest));
}

/** What a finished stop came back with. */
export type RecordOutcome =
  | { status: 'recorded'; sample: SampleRecord }
  | { status: 'refused'; reason: string };

/**
 * The recorder the screen owns through `useAudioRecorder` (expo-audio SDK 58
 * creates recorders only through the hook, so the glue takes the instance).
 */
export interface RecorderLike {
  prepareToRecordAsync(): Promise<void>;
  record(): void;
  stop(): Promise<void>;
  uri: string | null;
}

/** A recording in progress; `stop` finishes it into a sample. */
export interface RecordingHandle {
  stop: () => Promise<RecordOutcome>;
}

/** What beginning a sample came back with. */
export type BeginOutcome =
  | { status: 'recording'; handle: RecordingHandle }
  | { status: 'refused'; reason: string };

/**
 * Starts a recording for a consent that stands, on the caller's recorder. The
 * consent itself is the caller's gate (the screen disables the control without
 * one); here the microphone permission is asked for, because the permission
 * belongs to the moment the record control is tapped, not to the screen
 * opening.
 */
export async function beginSample(
  recorder: RecorderLike,
  consent: ConsentRecord,
  directory: Directory = samplesDirectory(),
  now: Date = new Date(),
): Promise<BeginOutcome> {
  let permission: { granted: boolean; status: string };
  try {
    permission = await requestRecordingPermissionsAsync();
  } catch (error) {
    return { status: 'refused', reason: `the microphone permission could not be read: ${firstLine(error)}` };
  }
  if (!permission.granted) {
    return { status: 'refused', reason: `the microphone permission is not granted (${permission.status})` };
  }

  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }

  try {
    await recorder.prepareToRecordAsync();
    recorder.record();
  } catch (error) {
    return { status: 'refused', reason: `the recorder could not start: ${firstLine(error)}` };
  }

  const id = newSampleId(now);
  const fileName = `${id}.m4a`;

  return {
    status: 'recording',
    handle: {
      stop: async (): Promise<RecordOutcome> => {
        try {
          await recorder.stop();
        } catch (error) {
          return { status: 'refused', reason: `the recorder could not stop: ${firstLine(error)}` };
        }
        const uri = recorder.uri;
        if (!uri) {
          return { status: 'refused', reason: 'the recorder produced no file' };
        }
        try {
          const recorded = new File(uri);
          const target = new File(directory, fileName);
          await recorded.copy(target);
          recorded.delete();

          const sample: SampleRecord = {
            id,
            file: fileName,
            createdAt: now.toISOString(),
            consentedId: consent.consentedId,
            wordingVersion: consent.version,
            scopes: [...consent.scopes],
            synthetic: false,
          };
          const manifest = await readManifest(directory);
          await writeManifest(appendSample(manifest, sample), directory);
          return { status: 'recorded', sample };
        } catch (error) {
          return { status: 'refused', reason: `the sample could not be kept: ${firstLine(error)}` };
        }
      },
    },
  };
}

/** Deletes one sample: its file and its manifest row. */
export async function deleteSample(
  id: string,
  directory: Directory = samplesDirectory(),
): Promise<{ status: 'deleted' } | { status: 'refused'; reason: string }> {
  try {
    const manifest = await readManifest(directory);
    const sample = manifest.samples.find((entry) => entry.id === id);
    if (sample) {
      const file = new File(directory, sample.file);
      if (file.exists) {
        file.delete();
      }
    }
    await writeManifest(removeSample(manifest, id), directory);
    return { status: 'deleted' };
  } catch (error) {
    return { status: 'refused', reason: `the sample could not be deleted: ${firstLine(error)}` };
  }
}

/**
 * Deletes EVERY sample - the revocation path: withdrawing consent removes the
 * recordings, so the directory goes with them and the manifest goes empty.
 */
export async function deleteAllSamples(
  directory: Directory = samplesDirectory(),
): Promise<{ status: 'deleted'; count: number } | { status: 'refused'; reason: string }> {
  try {
    const manifest = await readManifest(directory);
    for (const sample of manifest.samples) {
      const file = new File(directory, sample.file);
      if (file.exists) {
        file.delete();
      }
    }
    await writeManifest({ consentedId: manifest.consentedId, samples: [] }, directory);
    return { status: 'deleted', count: manifest.samples.length };
  } catch (error) {
    return { status: 'refused', reason: `the samples could not be deleted: ${firstLine(error)}` };
  }
}
