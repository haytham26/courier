/**
 * The manifest of the voice samples on the phone (audit A3 item 3).
 *
 * It mirrors the rows `docs/squads/voice/EVAL.md` demands of a consented
 * store: every sample carries its `consentedId` POINTER (no name, no PII),
 * the wording version its consent was given under, its scopes, and
 * `synthetic: false` - real consented audio is never marked synthetic, and
 * the CI check that guards the eval set keys off exactly that field.
 *
 * The manifest lives NEXT TO the audio (`<documentDirectory>/voice-samples/
 * manifest.json`), so deleting the directory deletes the audio and the
 * record of it together - the revocation path is one directory delete.
 */
import type { ConsentScope } from './consent';

/** One recorded sample. */
export interface SampleRecord {
  /** The sample's id (also part of its testID). */
  id: string;
  /** The file name inside the samples directory. */
  file: string;
  /** ISO date the sample was recorded. */
  createdAt: string;
  /** The consent record's pointer; the audio itself carries no PII. */
  consentedId: string;
  /** The wording version the consent was given under. */
  wordingVersion: string;
  /** The purposes this sample was consented for. */
  scopes: ConsentScope[];
  /** Always false here: real consented audio is never synthetic. */
  synthetic: false;
}

/** The manifest file's shape. */
export interface SampleManifest {
  /** The consentedId every sample of this phone points at. */
  consentedId: string;
  samples: SampleRecord[];
}

/** The empty manifest. */
export const EMPTY_MANIFEST: SampleManifest = { consentedId: '', samples: [] };

function isSample(raw: unknown): raw is SampleRecord {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const source = raw as Record<string, unknown>;
  return (
    typeof source.id === 'string' &&
    typeof source.file === 'string' &&
    typeof source.createdAt === 'string' &&
    typeof source.consentedId === 'string' &&
    typeof source.wordingVersion === 'string' &&
    Array.isArray(source.scopes) &&
    source.synthetic === false
  );
}

/**
 * The manifest out of anything that was stored. A missing or corrupt file is
 * the empty manifest, never a crash: a courier in a dead spot still gets the
 * screen, and a corrupt manifest must not be mistaken for samples.
 */
export function parseSampleManifest(raw: string | null): SampleManifest {
  if (raw === null || raw.trim().length === 0) {
    return { ...EMPTY_MANIFEST, samples: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY_MANIFEST, samples: [] };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ...EMPTY_MANIFEST, samples: [] };
  }
  const source = parsed as Record<string, unknown>;
  const samples = Array.isArray(source.samples) ? source.samples.filter(isSample) : [];
  return {
    consentedId: typeof source.consentedId === 'string' ? source.consentedId : '',
    samples,
  };
}

/** A fresh sample id from the clock. */
export function newSampleId(now: Date): string {
  const stamp = now.getTime().toString(36);
  const roll = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `sample-${stamp}-${roll}`;
}

/** The manifest with one sample appended (immutable). */
export function appendSample(manifest: SampleManifest, sample: SampleRecord): SampleManifest {
  return { consentedId: manifest.consentedId || sample.consentedId, samples: [...manifest.samples, sample] };
}

/** The manifest with one sample removed (immutable). */
export function removeSample(manifest: SampleManifest, id: string): SampleManifest {
  return { ...manifest, samples: manifest.samples.filter((sample) => sample.id !== id) };
}
