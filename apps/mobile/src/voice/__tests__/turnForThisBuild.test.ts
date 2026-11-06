/**
 * The E2E seam of the voice turn flow (D1): the same pattern as
 * `src/pod/podForThisBuild.ts` - in the E2E build (EXPO_PUBLIC_E2E=1, inlined
 * at bundle time) a tap on the Copilot sphere injects a canned transcript into
 * the turn flow instead of opening a microphone there is no model for, and the
 * voice client answers the canned session and turn; in every other build the
 * seam is inert and the real client is used.
 *
 * The flags are read at CALL time (like the pod seam), so the tests can flip
 * them per case.
 */
// The seam imports the app's auth client for the real client's token; the
// better-auth package is ESM-only and does not load in jest, so it is mocked
// (the E2E mock client never asks for a token).
jest.mock('@/lib/auth-client', () => ({ sessionToken: jest.fn(() => Promise.resolve('e2e-token')) }));

import { CourierVoiceClient } from '../courierVoiceClient';
import {
  cannedTurnForThisBuild,
  nextCannedTranscript,
  voiceClientForThisBuild,
} from '../turnForThisBuild';

describe('turnForThisBuild (the D1 E2E seam)', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_E2E;
  });

  it('is inert outside the E2E build: no canned turn, the real client', () => {
    delete process.env.EXPO_PUBLIC_E2E;
    const send = jest.fn();
    expect(cannedTurnForThisBuild(send)).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(nextCannedTranscript()).toBeNull();
    expect(voiceClientForThisBuild()).toBeInstanceOf(CourierVoiceClient);
  });

  it('injects the canned transcripts in order in the E2E build, then stops', () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    const send = jest.fn();
    expect(cannedTurnForThisBuild(send)).toBe(true);
    expect(send).toHaveBeenLastCalledWith('how many stops are left on the run');
    expect(cannedTurnForThisBuild(send)).toBe(true);
    expect(send).toHaveBeenLastCalledWith('delivered');
    // The queue is drained: a further tap falls back to the real listening.
    expect(cannedTurnForThisBuild(send)).toBe(false);
    expect(send).toHaveBeenCalledTimes(2);
    expect(nextCannedTranscript()).toBeNull();
  });

  it('answers the canned session and the canned turn in the E2E build', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    const client = voiceClientForThisBuild();
    expect(client).not.toBeInstanceOf(CourierVoiceClient);

    const session = await client.startSession();
    expect(session.id).toBe('e2e-voice-session');
    expect(session.driver_id).toBe('e2e-driver');

    const answer = await client.sendTurn(session.id, {
      transcript: 'how many stops are left on the run',
    });
    expect(answer.speech).toBe('Four stops left on the run.');
    expect(answer.action).toBeNull();
    expect(answer.gate).toBe('full');

    const other = await client.sendTurn(session.id, { transcript: 'anything else' });
    expect(other.gate).toBe('full');
  });
});
