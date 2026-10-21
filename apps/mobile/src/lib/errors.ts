/**
 * A short, plain description of a failure, safe to put in a log line.
 *
 * The app never shows a raw error to a courier and never prints one to the
 * console with the details of a crash, so every failure is reduced to one
 * line first.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'unknown error';
}
