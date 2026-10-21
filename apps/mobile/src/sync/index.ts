/**
 * The sync module: the event log, the queue and the network watch.
 *
 * The rule of the module: a screen never waits for the network. It writes
 * what the courier did to the phone, and the queue takes it to the server
 * when there is a network.
 */
export { createAddLocationNoteEvent, parseSyncEvent } from './events';
export type { AddLocationNoteEvent, AddLocationNotePayload, SyncEvent } from './events';
export { EventLog } from './eventLog';
export { FileKeyValueStore } from './fileStore';
export { ExpoNetworkMonitor, FixedNetworkMonitor } from './network';
export type { NetworkMonitor } from './network';
export { SyncService } from './syncService';
export type { FlushResult, SyncStatus } from './syncService';
export { MemoryKeyValueStore } from './storage';
export type { KeyValueStore } from './storage';
export { HttpSyncTransport } from './transport';
export type { SyncTransport } from './transport';
export { getAppStore, getSyncService, setAppStore, setSyncService } from './runtime';
