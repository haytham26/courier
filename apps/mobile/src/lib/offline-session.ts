/**
 * The offline session.
 *
 * A courier signs in once and then drives a whole shift, and a good part of
 * Canterbury has no signal. The session cookie is already in the device
 * store, but the app cannot ask the server whether it is still good when
 * there is no network.
 *
 * So the app keeps a small receipt next to the cookie: who the courier is
 * and when the server last confirmed the session. When the app opens with
 * no network it reads the receipt and opens with the last known session, for
 * as long as the receipt is young enough (a shift, not a week).
 *
 * The receipt is a convenience, not a permission: nothing in the app trusts
 * it for anything the server decides. It never leaves the device.
 */
import { readStoredValue, writeStoredValue } from './session-storage';

/** The key the receipt is stored under in the device store. */
export const OFFLINE_SESSION_KEY = 'courier_offline_session';

/**
 * How long an offline session lasts.
 *
 * A shift is the longest a courier is away from a signal, so twelve hours
 * covers a long day and nothing more.
 */
export const OFFLINE_SESSION_HOURS = 12;

export interface OfflineSessionUser {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  /** When the account was made, as the service reported it. */
  createdAt: string;
}

export interface OfflineSession {
  user: OfflineSessionUser;
  /** When the server last confirmed the session (epoch milliseconds). */
  confirmedAt: number;
  /** When the offline session runs out (epoch milliseconds). */
  expiresAt: number;
}

function isOfflineSessionUser(value: unknown): value is OfflineSessionUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const user = value as {
    id?: unknown;
    email?: unknown;
    name?: unknown;
    emailVerified?: unknown;
    createdAt?: unknown;
  };
  if (typeof user.id !== 'string' || typeof user.email !== 'string') {
    return false;
  }
  if (user.name !== undefined && typeof user.name !== 'string') {
    return false;
  }
  if (typeof user.emailVerified !== 'boolean' || typeof user.createdAt !== 'string') {
    return false;
  }
  return true;
}

function isOfflineSession(value: unknown): value is OfflineSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const session = value as Partial<OfflineSession>;
  return (
    isOfflineSessionUser(session.user) &&
    typeof session.confirmedAt === 'number' &&
    typeof session.expiresAt === 'number'
  );
}

/**
 * Remembers the signed-in courier, so the app can open without a signal.
 *
 * The receipt is written every time the server confirms the session.
 */
export async function rememberSession(user: OfflineSessionUser, now = Date.now()): Promise<void> {
  const session: OfflineSession = {
    user,
    confirmedAt: now,
    expiresAt: now + OFFLINE_SESSION_HOURS * 60 * 60 * 1000,
  };
  await writeStoredValue(OFFLINE_SESSION_KEY, JSON.stringify(session));
}

/**
 * Reads the stored session.
 *
 * Returns null when there is no receipt, when the receipt is not readable,
 * or when it is too old to trust. An old receipt is removed so the app does
 * not keep it around.
 */
export async function readOfflineSession(now = Date.now()): Promise<OfflineSession | null> {
  // The device store is not readable on every platform: the app opens signed
  // out rather than breaking.
  const raw = await readStoredValue(OFFLINE_SESSION_KEY);
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isOfflineSession(parsed)) {
    return null;
  }
  if (parsed.expiresAt <= now) {
    await forgetSession();
    return null;
  }
  return parsed;
}

/** Forgets the stored session (the courier signed out). */
export async function forgetSession(): Promise<void> {
  await writeStoredValue(OFFLINE_SESSION_KEY, '');
}
