/**
 * The one sentence of a failure, never its stack trace.
 *
 * A native module that fails reports WHY with a multi-line message: the
 * VisionCamera device factory on the emulator ("Device reporting less
 * cameras than anticipated ... Available cameras: 0") carries its five-line
 * Java trace inside the message itself. Rendered in the B.7 compatibility
 * screen's row it grew that row to 265px, pushed the screen's own state line
 * (`compat-running`) to y=663 on the 320x640 emulator viewport and therefore
 * out of view, and the Maestro flow that asserts the state line failed after
 * its 60 s timeout (BUG-109). The first line carries the whole diagnostic;
 * the trace does not.
 *
 * So the sentence is capped here, at the boundary that renders it, instead
 * of being trusted to stay short - a diagnostic that can move the screen it
 * describes is a defect in the diagnostic.
 */

/** The longest sentence a row shows before it is cut. */
const MAX_SENTENCE = 160;

/**
 * The first line of what a failure said, as one sentence.
 *
 * @param error the thrown value: an `Error` with a multi-line message, a
 * string, or something with no message at all.
 * @param fallback the sentence shown when the failure said nothing usable.
 * @returns one line, trimmed, capped at `MAX_SENTENCE`.
 */
export function firstLine(error: unknown, fallback = 'unknown reason'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const line = message
    .split('\n')
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
  const sentence = (line ?? fallback).trim();
  return sentence.length > MAX_SENTENCE ? `${sentence.slice(0, MAX_SENTENCE - 3)}...` : sentence;
}
