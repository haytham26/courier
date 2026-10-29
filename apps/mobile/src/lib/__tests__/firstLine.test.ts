/**
 * The sentence of a native failure, one line long.
 *
 * Why these tests exist (BUG-109): the api-35 leg of the Android E2E lost
 * `.maestro/compat.yaml` at `Assert that id: compat-running is visible`
 * because VisionCamera's failure message carries its five-line Java trace,
 * the compatibility row rendered all five lines, and the row pushed the
 * screen's own state line below the emulator's 320x640 viewport. The assert
 * polls and never scrolls, so it timed out. The assertion under test is the
 * one the fix makes: a row can never grow past the fold because of what a
 * failure said.
 */
import { firstLine } from '@/lib/firstLine';

describe('the sentence of a failure', () => {
  it("takes the first line of a native failure's stack-trace message", () => {
    const error = new Error(
      [
        'Device reporting less cameras than anticipated. Available cameras: 0',
        '\tat com.android.vision.camera.DeviceFactory.start(DeviceFactory.kt:42)',
        '\tat java.lang.reflect.Method.invoke(Native Method)',
        '\tat android.os.Handler.dispatchMessage(Handler.java:106)',
        '\tat android.os.Looper.loopOnce(Looper.java:230)',
      ].join('\n'),
    );

    expect(firstLine(error)).toBe(
      'Device reporting less cameras than anticipated. Available cameras: 0',
    );
  });

  it('keeps a short one-line message whole', () => {
    expect(firstLine(new Error('the API is restarting'))).toBe('the API is restarting');
  });

  it('trims the blank lines a native message often carries', () => {
    expect(firstLine(new Error('\n   the module is not linked   \nmore trace'))).toBe(
      'the module is not linked',
    );
  });

  it("falls back to the given sentence when the failure said nothing", () => {
    expect(firstLine(new Error(''), 'unknown reason')).toBe('unknown reason');
    expect(firstLine(new Error('   \n  '), 'unknown reason')).toBe('unknown reason');
  });

  it('caps a single line that runs long', () => {
    const long = 'x'.repeat(400);

    const sentence = firstLine(new Error(long));

    expect(sentence.length).toBe(160);
    expect(sentence.endsWith('...')).toBe(true);
    expect(long.startsWith(sentence.slice(0, -3))).toBe(true);
  });

  it('answers a sentence for a value that is not an Error', () => {
    expect(firstLine('the radio is off')).toBe('the radio is off');
    expect(firstLine(undefined, 'nothing was thrown')).toBe('nothing was thrown');
  });
});
