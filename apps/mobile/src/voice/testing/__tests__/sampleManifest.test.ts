/**
 * The sample manifest: every row carries the consent pointer, the wording
 * version and `synthetic: false` - real consented audio is never marked
 * synthetic (the eval set's CI check keys off that field).
 */
import {
  appendSample,
  newSampleId,
  parseSampleManifest,
  removeSample,
  type SampleRecord,
} from '../sampleManifest';

const SAMPLE: SampleRecord = {
  id: 'sample-1',
  file: 'sample-1.m4a',
  createdAt: '2026-11-07T09:00:00.000Z',
  consentedId: 'consented-abc',
  wordingVersion: 'draft-2026-11-07',
  scopes: ['evaluation'],
  synthetic: false,
};

describe('the sample manifest', () => {
  it('parses a stored manifest, and a corrupt file is the empty one', () => {
    const manifest = { consentedId: 'consented-abc', samples: [SAMPLE] };
    expect(parseSampleManifest(JSON.stringify(manifest))).toEqual(manifest);
    expect(parseSampleManifest(null)).toEqual({ consentedId: '', samples: [] });
    expect(parseSampleManifest('{not json')).toEqual({ consentedId: '', samples: [] });
    expect(parseSampleManifest('[]')).toEqual({ consentedId: '', samples: [] });
  });

  it('refuses a row that claims to be synthetic', () => {
    const raw = JSON.stringify({
      consentedId: 'consented-abc',
      samples: [{ ...SAMPLE, synthetic: true }],
    });
    expect(parseSampleManifest(raw).samples).toEqual([]);
  });

  it('appends and removes immutably', () => {
    const manifest = { consentedId: 'consented-abc', samples: [] as SampleRecord[] };
    const withOne = appendSample(manifest, SAMPLE);
    expect(withOne.samples).toHaveLength(1);
    expect(manifest.samples).toHaveLength(0);

    const other: SampleRecord = { ...SAMPLE, id: 'sample-2', file: 'sample-2.m4a' };
    const withTwo = appendSample(withOne, other);
    expect(withTwo.samples.map((s) => s.id)).toEqual(['sample-1', 'sample-2']);

    const withoutOne = removeSample(withTwo, 'sample-1');
    expect(withoutOne.samples.map((s) => s.id)).toEqual(['sample-2']);
    expect(withTwo.samples).toHaveLength(2);
  });

  it('sample ids are fresh', () => {
    const now = new Date('2026-11-07T09:00:00.000Z');
    expect(newSampleId(now)).toMatch(/^sample-/);
    expect(newSampleId(now)).not.toBe(newSampleId(now));
  });
});
