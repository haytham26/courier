// The test for the StoreReady job summary.
//
//   node --test scripts/ci/__tests__/store-ready-summary.test.mjs
//
// The renderer has to say what the tool said: a blocking finding stays a
// blocking finding, and the summary has to show the Play Console review the
// tool cannot do on its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSummary } from '../store-ready-summary.mjs';

const REPORT = {
  application_id: 'com.courier.copilot',
  target_sdk: '36',
  version_code: '1',
  manifest_path: 'apps/mobile/android/app/src/main/AndroidManifest.xml',
  findings: [
    {
      severity: 'CRITICAL',
      guideline: 'Security',
      title: 'Release app appears debuggable',
      detail: 'android:debuggable="true" can expose internals.',
      fix: 'Disable debuggable in the release build.',
      file: 'apps/mobile/android/app/src/main/AndroidManifest.xml',
    },
    {
      severity: 'WARN',
      guideline: 'Target SDK',
      title: 'Target SDK not detected',
      detail: 'Could not find targetSdk in the Gradle config.',
      fix: 'Set targetSdk in the module build.gradle.',
    },
  ],
  checklist: [
    {
      section: 'Background location',
      title: 'The declaration is done',
      status: 'needs_manual_review',
    },
    { section: 'Data safety', title: 'The answers are done', status: 'pass' },
  ],
  summary: { total: 2, critical: 1, warns: 1, infos: 0, passed: false },
};

test('a blocking finding stays a blocking finding in the job summary', () => {
  const { markdown, critical } = renderSummary([REPORT]);
  assert.equal(critical, 1);
  assert.match(markdown, /the release is not ready to submit/i);
  assert.match(markdown, /Release app appears debuggable/);
  assert.match(markdown, /Fix: Disable debuggable in the release build\./);
});

test('the summary shows the Play Console review the tool cannot do', () => {
  const { markdown } = renderSummary([REPORT]);
  assert.match(markdown, /Play Console review/);
  assert.match(markdown, /\[MANUAL\] Background location/);
  assert.doesNotMatch(markdown, /Data safety/);
});

test('a report without blocking findings says so', () => {
  const { markdown, critical } = renderSummary([
    { findings: [], summary: { total: 0, critical: 0, warns: 0, infos: 0, passed: true } },
  ]);
  assert.equal(critical, 0);
  assert.match(markdown, /no blocking finding/i);
});

test('the App Store Connect report, which numbers its severities, is read too', () => {
  const { markdown, critical } = renderSummary([
    {
      app_id: '6758967212',
      findings: [
        { tier: 1, severity: 2, guideline: '2.1', title: 'The privacy policy URL is missing' },
      ],
      summary: { total: 1, blocks: 1, warns: 0, infos: 0, passed: false },
    },
  ]);
  assert.equal(critical, 1);
  assert.match(markdown, /The privacy policy URL is missing/);
  assert.match(markdown, /not ready to submit/i);
});
