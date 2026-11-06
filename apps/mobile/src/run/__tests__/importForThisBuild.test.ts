/**
 * The spreadsheet import's seam (queue 4e, the trial's #6, ADR-025's app
 * half): which importer this build answers with.
 *
 * The E2E build has no API (local mocks, no Metro), exactly the way the
 * scanner's `readerForThisBuild` and the run's `dayForThisBuild` work: the
 * mock importer answers the canned import the flow asserts, and the release
 * build's one import path is the real client's `importStops` and no other.
 * The pasted file is still written to the cache in both builds - what is
 * proven on the emulator is the screen's own half, not the file's bytes.
 */
import type { ImportResponse } from '@courier/shared/src/generated/api';

import type { ApiOutcome } from '@/lib/api-client';

const mockImportStops = jest.fn(
  (_shiftId: string, _file: { name: string; type: string; uri: string }): Promise<ApiOutcome<ImportResponse>> =>
    Promise.resolve({ status: 'ok', data: { shift_id: 'shift-1', imported: 0, stop_ids: [], ignored_columns: [] } }),
);

jest.mock('@/lib/api-client', () => ({
  CourierApiClient: jest.fn(() => ({ importStops: mockImportStops })),
}));

const mockWritten: { name: string; text: string }[] = [];
const mockCreated: { name: string; options: unknown }[] = [];

jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache' } },
  File: jest.fn((_dir: unknown, name: string) => ({
    uri: `file:///cache/${name}`,
    exists: true,
    create: (options: unknown) => {
      mockCreated.push({ name, options });
    },
    write: (text: string) => {
      mockWritten.push({ name, text });
      return Promise.resolve();
    },
  })),
}));

const THE_FILE = { name: 'stops-import.csv', type: 'text/csv', uri: 'file:///cache/stops-import.csv' };

describe('the importer of this build (queue 4e)', () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
  });

  it('is the real client\u2019s importStops in a release build', async () => {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../importForThisBuild')>('../importForThisBuild');
    mockImportStops.mockClear();
    mockImportStops.mockResolvedValue({
      status: 'ok',
      data: { shift_id: 'shift-1', imported: 2, stop_ids: ['s-1', 's-2'], ignored_columns: [] },
    });

    const outcome = await loaded.importerForThisBuild().importStops('shift-1', THE_FILE);

    expect(mockImportStops).toHaveBeenCalledWith('shift-1', THE_FILE);
    expect(outcome.status).toBe('ok');
  });

  it('answers the canned import in the E2E build, without dialing anything', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../importForThisBuild')>('../importForThisBuild');
    mockImportStops.mockClear();

    const outcome = await loaded.importerForThisBuild().importStops('shift-e2e', THE_FILE);

    expect(mockImportStops).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      status: 'ok',
      data: {
        shift_id: 'shift-e2e',
        imported: 2,
        stop_ids: ['imported-1', 'imported-2'],
        ignored_columns: ['notes'],
      },
    });
  });
});

/**
 * The pasted spreadsheet's own file: written to the app's cache as the .csv
 * the contract names, and answered as the multipart part's {name, type, uri}.
 */
describe('the pasted spreadsheet\u2019s file (queue 4e)', () => {
  it('writes the pasted text to the cache file and answers its uri', async () => {
    mockWritten.length = 0;
    mockCreated.length = 0;
    jest.resetModules();
    const loaded = jest.requireActual<typeof import('../importForThisBuild')>('../importForThisBuild');

    const file = await loaded.writeImportFile('address,type,notes\n1 Import Lane, delivery, leave at door');

    expect(file).toEqual({ name: 'stops-import.csv', type: 'text/csv', uri: 'file:///cache/stops-import.csv' });
    expect(mockWritten).toEqual([
      { name: 'stops-import.csv', text: 'address,type,notes\n1 Import Lane, delivery, leave at door' },
    ]);
    expect(mockCreated[0]?.options).toEqual({ intermediates: true, overwrite: true });
  });
});
