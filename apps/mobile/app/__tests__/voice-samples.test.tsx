/**
 * The voice-sample recorder screen (audit A3 item 3): the opt-in recorder of
 * the debug build. The contract the flows and this suite pin: the exact
 * per-purpose wording is on the screen, the record control is disabled until
 * a purpose is consented to, a finished recording lands in the list with its
 * consent pointer, delete removes it, and revoking consent deletes every
 * sample. In a release build the screen says the tool is not there.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import { inspect } from '@/components/chosen/test-support';
import { CONSENT_WORDING } from '@/voice/testing/consent';
import type { SampleManifest, SampleRecord } from '@/voice/testing/sampleManifest';
import VoiceSamplesRoute from '../voice-samples';

// The recorder's native glue is answered in memory; the consent and manifest
// logic under it is the real thing. The mocks are created inside the factory
// and reached through the mocked module, so no factory runs before the
// handles exist.
jest.mock('@/voice/testing/sampleRecorder', () => ({
  beginSample: jest.fn(),
  readManifest: jest.fn(),
  deleteSample: jest.fn(),
  deleteAllSamples: jest.fn(),
  samplesDirectory: jest.fn(() => ({ uri: 'file:///docs/voice-samples' })),
}));

// The screen owns its recorder through the expo-audio hook, which has no
// native runtime in jest.
jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } },
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(() => Promise.resolve()),
    record: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
    uri: null,
  })),
}));

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

import * as sampleRecorder from '@/voice/testing/sampleRecorder';

const mockBeginSample = sampleRecorder.beginSample as jest.MockedFunction<typeof sampleRecorder.beginSample>;
const mockReadManifest = sampleRecorder.readManifest as jest.MockedFunction<typeof sampleRecorder.readManifest>;
const mockDeleteSample = sampleRecorder.deleteSample as jest.MockedFunction<typeof sampleRecorder.deleteSample>;
const mockDeleteAllSamples = sampleRecorder.deleteAllSamples as jest.MockedFunction<
  typeof sampleRecorder.deleteAllSamples
>;

/** The props a control carries, read off the rendered tree through the typed helper. */
const isDisabled = (testID: string): boolean => {
  const props = inspect(screen.getByTestId(testID));
  const state = props.accessibilityState as { disabled?: boolean } | undefined;
  const own = props.disabled as boolean | undefined;
  return state?.disabled ?? own ?? false;
};

const valueOf = (testID: string): boolean | undefined =>
  inspect(screen.getByTestId(testID)).value as boolean | undefined;

const SAMPLE: SampleRecord = {
  id: 'sample-abc',
  file: 'sample-abc.m4a',
  createdAt: '2026-11-07T09:00:00.000Z',
  consentedId: 'consented-abc',
  wordingVersion: 'draft-2026-11-07',
  scopes: ['evaluation'],
  synthetic: false,
};

let manifest: SampleManifest;

function renderScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        <VoiceSamplesRoute />
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

describe('the voice-sample recorder screen', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const originalDev = g.__DEV__;
  const originalE2E = process.env.EXPO_PUBLIC_E2E;

  beforeEach(() => {
    g.__DEV__ = true;
    delete process.env.EXPO_PUBLIC_E2E;
    manifest = { consentedId: '', samples: [] };
    jest.clearAllMocks();
    mockReadManifest.mockImplementation(() => Promise.resolve(manifest));
    mockDeleteSample.mockImplementation(() => {
      manifest = { ...manifest, samples: manifest.samples.filter((s) => s.id !== 'sample-abc') };
      return Promise.resolve({ status: 'deleted' as const });
    });
    mockDeleteAllSamples.mockImplementation(() => {
      const count = manifest.samples.length;
      manifest = { ...manifest, samples: [] };
      return Promise.resolve({ status: 'deleted' as const, count });
    });
    mockBeginSample.mockImplementation((_recorder, consent) =>
      Promise.resolve({
        status: 'recording' as const,
        handle: {
          stop: () => {
            manifest = { consentedId: consent.consentedId, samples: [SAMPLE] };
            return Promise.resolve({ status: 'recorded' as const, sample: SAMPLE });
          },
        },
      }),
    );
  });

  afterEach(() => {
    g.__DEV__ = originalDev;
    if (originalE2E === undefined) {
      delete process.env.EXPO_PUBLIC_E2E;
    } else {
      process.env.EXPO_PUBLIC_E2E = originalE2E;
    }
  });

  it('shows the exact per-purpose wording, and the record control is off until a purpose is consented to', async () => {
    renderScreen();

    expect(await screen.findByTestId('voice-samples-screen')).toBeTruthy();
    expect(screen.getByTestId('voice-samples-wording-evaluation')).toHaveTextContent(
      new RegExp(CONSENT_WORDING.evaluation.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
    expect(screen.getByTestId('voice-samples-wording-training')).toBeTruthy();

    expect(isDisabled('voice-samples-record')).toBe(true);
  });

  it('is not in a release build', () => {
    g.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_E2E;
    renderScreen();

    expect(screen.getByTestId('voice-samples-gone')).toBeTruthy();
    expect(screen.queryByTestId('voice-samples-record')).toBeNull();
  });

  it('records only with a standing consent, and the sample lands in the list', async () => {
    renderScreen();
    await screen.findByTestId('voice-samples-screen');

    fireEvent(screen.getByTestId('voice-samples-consent-evaluation'), 'onValueChange', true);
    await waitFor(() => expect(isDisabled('voice-samples-record')).toBe(false));

    fireEvent.press(screen.getByTestId('voice-samples-record'));
    await waitFor(() => expect(mockBeginSample).toHaveBeenCalledTimes(1));
    const consent = mockBeginSample.mock.calls[0][1];
    expect(consent.scopes).toEqual(['evaluation']);
    expect(consent.revokedAt).toBeNull();

    expect(await screen.findByTestId('voice-samples-stop')).toBeTruthy();
    fireEvent.press(screen.getByTestId('voice-samples-stop'));

    expect(await screen.findByTestId('voice-samples-sample-sample-abc')).toBeTruthy();
    expect(screen.queryByTestId('voice-samples-empty')).toBeNull();
  });

  it('delete removes the sample from the list', async () => {
    manifest = { consentedId: 'consented-abc', samples: [SAMPLE] };
    renderScreen();
    expect(await screen.findByTestId('voice-samples-sample-sample-abc')).toBeTruthy();

    fireEvent.press(screen.getByTestId('voice-samples-sample-sample-abc-delete'));
    await waitFor(() => expect(mockDeleteSample).toHaveBeenCalledWith('sample-abc'));
    await waitFor(() => expect(screen.getByTestId('voice-samples-empty')).toBeTruthy());
  });

  it('revoking consent (second tap) deletes every sample and clears the consents', async () => {
    manifest = { consentedId: 'consented-abc', samples: [SAMPLE] };
    renderScreen();
    await screen.findByTestId('voice-samples-sample-sample-abc');

    fireEvent(screen.getByTestId('voice-samples-consent-evaluation'), 'onValueChange', true);
    await waitFor(() => expect(valueOf('voice-samples-consent-evaluation')).toBe(true));

    fireEvent.press(screen.getByTestId('voice-samples-revoke'));
    fireEvent.press(screen.getByTestId('voice-samples-revoke'));

    await waitFor(() => expect(mockDeleteAllSamples).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('voice-samples-empty')).toBeTruthy());
    expect(valueOf('voice-samples-consent-evaluation')).toBe(false);
    expect(isDisabled('voice-samples-record')).toBe(true);
  });
});
