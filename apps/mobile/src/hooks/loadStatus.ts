/**
 * The state of a screen that loads something from the server.
 *
 * Every screen has all of them (`docs/design/SYSTEM.md` §4): a skeleton while
 * it loads, the value when it is there, and a plain sentence with a way out
 * when it failed.
 */
export type LoadStatus = 'loading' | 'ready' | 'error';
