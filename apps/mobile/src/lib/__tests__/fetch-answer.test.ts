/**
 * The envelope unwrap (src/lib/fetch-answer.ts) - BUG-171's pin.
 *
 * `@better-fetch/fetch`'s `$fetch` resolves `{ data, error, status }`; only
 * the `data` field is the document, and a bare body is not an envelope.
 */
import { fetchAnswerBody } from '../fetch-answer';

describe('the document of a client call', () => {
  it('reads the document out of the envelope', () => {
    expect(fetchAnswerBody({ data: { token: 't' }, error: null, status: 200 })).toEqual({
      token: 't',
    });
  });

  it('answers the envelope data of null when the call failed', () => {
    expect(
      fetchAnswerBody({ data: null, error: { status: 401, message: 'no session' }, status: 401 }),
    ).toBeNull();
  });

  it('does not believe a bare body (no data field)', () => {
    expect(fetchAnswerBody({ token: 't' })).toBeNull();
  });

  it('answers null for a non-object answer', () => {
    expect(fetchAnswerBody(undefined)).toBeNull();
    expect(fetchAnswerBody(null)).toBeNull();
    expect(fetchAnswerBody('body')).toBeNull();
  });
});
