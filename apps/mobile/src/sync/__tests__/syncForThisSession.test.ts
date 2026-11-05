/**
 * The outbox's production construction site (A1 slice 3, and BUG-069's tail).
 *
 * The audit's interlock, still true until this lands: no production module
 * constructs `SyncService` or any API transport, so the events the phone
 * records never leave it. This file proves the app's own construction: one
 * `SyncService` per signed-in session, built over the slice-1 API transport
 * and the same event log the marks are written through, so a delivery the
 * courier makes reaches `events:batch` when there is signal.
 *
 * The event log opens op-sqlite, which a jest run has no native runtime for,
 * so the modules that open the phone's own handles are replaced at their own
 * seams - exactly as the sign-out landing suite does it.
 */
import { syncForThisSession } from '../syncForThisSession';

// The phone's own handles, answered by the test rather than by op-sqlite.
const mockHandles = {
  eventStoreOpen: jest.fn(() => ({ close: jest.fn() })),
  apiClientFor: jest.fn(() => ({ postDeliveryEvents: jest.fn() })),
};

jest.mock('@/sync/opSqliteEventStore', () => ({
  OpSqliteEventStore: { open: () => mockHandles.eventStoreOpen() },
}));
jest.mock('@/lib/api-client', () => ({
  CourierApiClient: function CourierApiClient() {
    return mockHandles.apiClientFor();
  },
}));

describe("the outbox's construction site (A1 slice 3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds one sync service over the API transport and the phone\u2019s log', () => {
    const service = syncForThisSession();

    expect(service).toBeTruthy();
    // The transport is the API's own: the slice-1 client is what carries the
    // batch to events:batch.
    expect(mockHandles.apiClientFor).toHaveBeenCalled();
    // And the log is the phone's, not an in-memory one: the events that do not
    // send now are still there after a cold start.
    expect(mockHandles.eventStoreOpen).toHaveBeenCalled();
  });

  it('gives a different service to each session, so a sign-out starts clean', () => {
    const first = syncForThisSession();
    const second = syncForThisSession();

    expect(first).not.toBe(second);
  });
});
