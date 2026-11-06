/**
 * The spreadsheet import of this build (queue 4e, the trial's #6, ADR-025's
 * app half).
 *
 * The E2E build has no API (local mocks, no Metro), so this is the same seam
 * the scanner's `readerForThisBuild` and the run's `dayForThisBuild` already
 * use: in the E2E build the importer answers the canned import the flow
 * asserts, and in every other build the one import path is the real client's
 * `importStops` and no other. The pasted file is written to the cache in
 * BOTH builds - what the emulator proves is the screen's own half (the
 * sheet, the file, the note), not the server's parse of the bytes.
 *
 * There is no document picker in this app (expo-document-picker is not a
 * dependency), so the courier's surface is the paste: the sheet pastes the
 * CSV text, this module writes it to the cache as the .csv the contract
 * names, and the multipart part is built from that file.
 */
import { File, Paths } from 'expo-file-system';

import type { ImportResponse } from '@courier/shared/src/generated/api';

import { CourierApiClient, type ApiOutcome } from '@/lib/api-client';

/** The file the import sends, as the multipart part is built from it. */
export interface ImportFile {
  name: string;
  type: string;
  uri: string;
}

/** The import ask: one file into one shift. */
export interface StopImporter {
  importStops(shiftId: string, file: ImportFile): Promise<ApiOutcome<ImportResponse>>;
}

/** The name the pasted spreadsheet is written under: the contract's own .csv. */
const IMPORT_FILE_NAME = 'stops-import.csv';

/**
 * Writes the pasted spreadsheet to the app's cache and answers the file the
 * multipart part is built from. The cache is the app's own scratch space, so
 * a paste never lands in a place the courier did not choose.
 */
export async function writeImportFile(text: string): Promise<ImportFile> {
  const file = new File(Paths.cache, IMPORT_FILE_NAME);
  file.create({ intermediates: true, overwrite: true });
  await file.write(text);
  return { name: IMPORT_FILE_NAME, type: 'text/csv', uri: file.uri };
}

/** The app's one HTTP boundary: the import asks the server in every real build. */
const apiClient = new CourierApiClient();

/**
 * The importer of the E2E build: answers the canned import the flow asserts -
 * two stops landed, and the `notes` column answered as ignored, because the
 * contract answers unknown columns rather than dropping them (ADR-025).
 */
function createMockStopImporter(): StopImporter {
  return {
    importStops: (shiftId: string) =>
      Promise.resolve({
        status: 'ok' as const,
        data: {
          shift_id: shiftId,
          imported: 2,
          stop_ids: ['imported-1', 'imported-2'],
          ignored_columns: ['notes'],
        },
      }),
  };
}

/** The importer of this build: the mock in the E2E build, the real client everywhere else. */
export const importerForThisBuild = (): StopImporter =>
  process.env.EXPO_PUBLIC_E2E === '1'
    ? createMockStopImporter()
    : { importStops: (shiftId, file) => apiClient.importStops(shiftId, file) };
