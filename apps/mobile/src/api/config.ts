/**
 * Where the app talks to the API.
 *
 * The address comes from the environment, so the same build talks to the
 * laptop in development and to the staging server in a test build.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
