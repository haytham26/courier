/**
 * The one HTTP client the app talks to the API with.
 *
 * It is created lazily, so a test can put its own client in place before
 * the app asks for one.
 */
import { API_BASE_URL } from './config';
import { getAuthToken } from './authToken';
import { HttpClient } from './httpClient';

let client: HttpClient | null = null;

export function getApiClient(): HttpClient {
  if (client === null) {
    client = new HttpClient({ baseUrl: API_BASE_URL, getToken: getAuthToken });
  }
  return client;
}

/** Test seam: puts another client in place (or clears it with null). */
export function setApiClient(next: HttpClient | null): void {
  client = next;
}
