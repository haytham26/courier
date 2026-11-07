/**
 * The debug-build testing tools (audit A3 item 3): the opt-in voice-sample
 * recorder for beta couriers, debug builds only.
 */
export { recorderForThisBuild } from './recorderForThisBuild';
export {
  CONSENT_PREFERENCE_KEY,
  CONSENT_SCOPES,
  CONSENT_WORDING,
  CONSENT_WORDING_VERSION,
  consentRecordFor,
  isConsentActive,
  newConsentedId,
  parseConsentRecord,
  revokedRecord,
  type ConsentRecord,
  type ConsentScope,
} from './consent';
export {
  appendSample,
  EMPTY_MANIFEST,
  newSampleId,
  parseSampleManifest,
  removeSample,
  type SampleManifest,
  type SampleRecord,
} from './sampleManifest';
export {
  beginSample,
  deleteAllSamples,
  deleteSample,
  MANIFEST_FILE_NAME,
  manifestFile,
  readManifest,
  SAMPLES_DIRECTORY_NAME,
  samplesDirectory,
  type BeginOutcome,
  type RecordOutcome,
  type RecordingHandle,
} from './sampleRecorder';
