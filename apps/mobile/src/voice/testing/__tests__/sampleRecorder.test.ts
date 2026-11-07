/**
 * The recorder glue over expo-audio and expo-file-system, with both native
 * modules answered in memory: the record path keeps the file next to the
 * manifest with the consent pointer on its row, and the delete paths remove
 * the file together with the row (revocation deletes the recordings).
 */
import { requestRecordingPermissionsAsync } from 'expo-audio';

import { beginSample, deleteAllSamples, deleteSample, readManifest, samplesDirectory } from '../sampleRecorder';
import { consentRecordFor } from '../consent';

// The in-memory file system the expo-file-system mock answers with.
const mockFsFiles = new Map<string, string>();

jest.mock('expo-file-system', () => {
  const join = (...parts: unknown[]) =>
    parts
      .map((part, index) => {
        const s = typeof part === 'string' ? part : (part as { uri: string }).uri;
        return index === 0 ? s.replace(/\/$/, '') : s.replace(/^\/|\/$/g, '');
      })
      .join('/');

  class MockDirectory {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = join(...parts);
    }
    get exists(): boolean {
      return [...mockFsFiles.keys()].some((key) => key.startsWith(this.uri + '/')) || this.uri === 'file:///docs';
    }
    create(): void {
      // directories are implicit in the map: their files carry the prefix
    }
  }

  class MockFile {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.length === 1 ? parts[0] : join(...parts);
    }
    get exists(): boolean {
      return mockFsFiles.has(this.uri);
    }
    create(): void {
      mockFsFiles.set(this.uri, '');
    }
    async text(): Promise<string> {
      return Promise.resolve(mockFsFiles.get(this.uri) ?? '');
    }
    async write(raw: string): Promise<void> {
      mockFsFiles.set(this.uri, raw);
      return Promise.resolve();
    }
    async copy(target: MockFile): Promise<void> {
      mockFsFiles.set(target.uri, mockFsFiles.get(this.uri) ?? '');
      return Promise.resolve();
    }
    delete(): void {
      mockFsFiles.delete(this.uri);
    }
  }

  return {
    Paths: { document: 'file:///docs', bundle: 'file:///bundle' },
    Directory: MockDirectory,
    File: MockFile,
  };
});

const mockRecorder = {
  prepareToRecordAsync: jest.fn(() => Promise.resolve()),
  record: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  uri: '',
};

jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
}));

const mockRequestPermission = requestRecordingPermissionsAsync as jest.Mock;

describe('the sample recorder', () => {
  const now = new Date('2026-11-07T09:00:00.000Z');
  const consent = consentRecordFor('driver-1', ['evaluation', 'training'], null, now);

  beforeEach(() => {
    mockFsFiles.clear();
    jest.clearAllMocks();
    mockRequestPermission.mockResolvedValue({ granted: true, status: 'granted' });
    mockRecorder.uri = '';
    mockRecorder.stop.mockImplementation(() => {
      mockRecorder.uri = 'file:///cache/recording.m4a';
      mockFsFiles.set(mockRecorder.uri, 'AUDIO-BYTES');
      return Promise.resolve();
    });
  });

  it('refuses when the microphone permission is not granted', async () => {
    mockRequestPermission.mockResolvedValue({ granted: false, status: 'denied' });
    const outcome = await beginSample(mockRecorder, consent, samplesDirectory(), now);
    expect(outcome.status).toBe('refused');
    if (outcome.status === 'refused') {
      expect(outcome.reason).toMatch(/not granted/);
    }
  });

  it('records a sample: the file lands next to the manifest, the row carries the consent pointer and synthetic: false', async () => {
    const begun = await beginSample(mockRecorder, consent, samplesDirectory(), now);
    expect(begun.status).toBe('recording');
    if (begun.status !== 'recording') return;

    const outcome = await begun.handle.stop();
    if (outcome.status === 'refused') {
      console.log('REFUSAL REASON:', outcome.reason);
    }
    expect(outcome.status).toBe('recorded');
    if (outcome.status !== 'recorded') return;

    expect(outcome.sample.consentedId).toBe(consent.consentedId);
    expect(outcome.sample.wordingVersion).toBe(consent.version);
    expect(outcome.sample.scopes).toEqual(['evaluation', 'training']);
    expect(outcome.sample.synthetic).toBe(false);

    const dir = samplesDirectory();
    expect(mockFsFiles.has(`${dir.uri}/${outcome.sample.file}`)).toBe(true);

    const manifest = await readManifest(dir);
    expect(manifest.samples).toHaveLength(1);
    expect(manifest.samples[0]).toEqual(outcome.sample);
    // the temp recording is gone: the audio lives only in the samples dir
    expect(mockFsFiles.has('file:///cache/recording.m4a')).toBe(false);
  });

  it('deleteSample removes the file and the row', async () => {
    const begun = await beginSample(mockRecorder, consent, samplesDirectory(), now);
    if (begun.status !== 'recording') throw new Error('expected recording');
    const outcome = await begun.handle.stop();
    if (outcome.status !== 'recorded') throw new Error('expected recorded');

    const dir = samplesDirectory();
    const result = await deleteSample(outcome.sample.id, dir);
    expect(result.status).toBe('deleted');
    expect((await readManifest(dir)).samples).toHaveLength(0);
    expect(mockFsFiles.has(`${dir.uri}/${outcome.sample.file}`)).toBe(false);
    // the manifest file itself stays
    expect(mockFsFiles.has(`${dir.uri}/manifest.json`)).toBe(true);
  });

  it('deleteAllSamples is the revocation path: every file goes with the rows', async () => {
    for (let i = 0; i < 2; i += 1) {
      const begun = await beginSample(mockRecorder, consent, samplesDirectory(), new Date(now.getTime() + i));
      if (begun.status !== 'recording') throw new Error('expected recording');
      await begun.handle.stop();
    }
    const dir = samplesDirectory();
    expect((await readManifest(dir)).samples).toHaveLength(2);

    const result = await deleteAllSamples(dir);
    expect(result).toEqual({ status: 'deleted', count: 2 });
    expect((await readManifest(dir)).samples).toHaveLength(0);
    expect([...mockFsFiles.keys()].filter((key) => key.startsWith(`${dir.uri}/`) && key.endsWith('.m4a'))).toHaveLength(0);
  });

  it('a read of a missing manifest is the empty one, never a crash', async () => {
    expect(await readManifest(samplesDirectory())).toEqual({ consentedId: '', samples: [] });
  });
});
