/**
 * The import sheet's paste field on a tall window with the soft keyboard up
 * (BUG-305).
 *
 * The CI evidence (run 42866833804, both large legs): `.maestro/import.yaml`
 * completed every step through the paste and the import, and then failed at
 * the sheet's own dismiss control. The failure dumps carry the geometry that
 * explains it, on both api levels:
 *
 *   api-34-large: stops-import-text  [98,656][1342,1104]
 *                 stops-import-go     [382,1020][572,1188]
 *                 stops-import-dismiss [98,1020][340,1188]   -> 84 px of overlap
 *   api-35-large: the same boxes, and Maestro refuses the tap outright
 *                 ("Tap on id: stops-import-dismiss" fails: the tap point is
 *                 taken by the paste field)
 *
 * The paste field is a multiline TextInput whose box follows its content, and
 * the sheet's scroll view had less room than the field needs once the
 * Keyboard event's IME inset pads the sheet (edge-to-edge Android, BUG-197).
 * The field's box therefore extends past the scroll view's allocation and OVER
 * the actions row, so a tap aimed at the dismiss button's centre lands on the
 * text field: the sheet never closes. The small legs (320x640 dp, a shorter
 * keyboard) have 133 dp of room against the field's 128 dp, which is why the
 * same build is green there.
 *
 * The fix bounds the field's height by the room the sheet actually has, so the
 * field's box can never reach the actions row. The claim below is the geometry,
 * read from the tokens the screen applies - a hardcoded fraction is how a
 * layout defect reads as a test defect (todaySheetTall.test.tsx's lesson).
 *
 *   (this file is jest's, like its neighbours: `pnpm --filter mobile test`)
 */
import { Dimensions } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { importSheetLayoutFor } from '../stops';
import RouteTab from '../stops';
import { RunProvider } from '@/maps/runState';
import { e2eDay } from '@/run/dayForThisBuild';
import { spacing, typography } from '@courier/design-tokens/chosen';

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Map: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
    Camera: (props: { testID?: string }) => ReactActual.createElement(RN.View, { testID: props.testID }),
    Marker: (props: { testID?: string; children?: React.ReactNode }) =>
      ReactActual.createElement(RN.View, { testID: props.testID }, props.children),
  };
});

jest.mock('@expo/vector-icons', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    MaterialCommunityIcons: (props: { name: string }) =>
      ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name),
    Ionicons: (props: { name: string }) =>
      ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name),
  };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, status: 'denied' })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('@/maps/packFiles', () => ({
  loadOfflinePack: jest.fn(() =>
    Promise.resolve({
      state: { status: 'missing' },
      locations: { downloadedFileUrl: null, bundledFileUrl: null },
    }),
  ),
  localGlyphsUrl: jest.fn(() => null),
}));

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof import('@/sync/storage')>('@/sync/storage');
  return { createFilePreferenceStore: () => actual.createMemoryPreferenceStore() };
});

jest.mock('@/lib/api-client', () => ({
  CourierApiClient: jest.fn(() => ({ reoptRoute: () => Promise.resolve(undefined) })),
}));

jest.mock('@/run/importForThisBuild', () => ({
  importerForThisBuild: () => ({
    importStops: () =>
      Promise.resolve({
        status: 'ok',
        data: { shift_id: 'shift-e2e', imported: 2, stop_ids: ['imported-1', 'imported-2'], ignored_columns: ['notes'] },
      }),
  }),
  writeImportFile: () =>
    Promise.resolve({ name: 'stops-import.csv', type: 'text/csv', uri: 'file:///cache/stops-import.csv' }),
}));

/** The large AVD's window: 1440x2560 px at 560 dpi = 411x731 dp. */
const LARGE_WINDOW = { width: 411, height: 731, scale: 3.5, fontScale: 1 };
/** The small AVD's window: 320x640 dp. */
const SMALL_WINDOW = { width: 320, height: 640, scale: 2, fontScale: 1 };

/**
 * The room the sheet's scroll view has, from the tokens the screen applies:
 * the card's own chrome (top 64, bottom 64, padding 20 either side), the
 * Keyboard event's inset, the two answer lines (note + ignored columns) and
 * the actions row, and the scroll view's own content (the title, the hint's
 * three lines at the narrowest width, and the gaps between them).
 */
const roomFor = (windowHeight: number, keyboardHeight: number): number => {
  const sheetChrome = spacing.space64 + spacing.space64 + spacing.space20 + spacing.space20;
  const notesAndActions = typography.body.lineHeight + typography.body.lineHeight + spacing.space48;
  const scrollChrome =
    typography.largeTitle.lineHeight +
    spacing.space12 +
    3 * typography.body.lineHeight +
    spacing.space12;
  return windowHeight - sheetChrome - keyboardHeight - notesAndActions - scrollChrome;
};

describe("the import sheet's paste field never reaches the actions row (BUG-305)", () => {
  it('bounds the field by the room the sheet has, so its box ends above the actions row', () => {
    // Every window and keyboard height the device can report: the field's box
    // must fit inside the scroll view's allocation, which is what the CI dumps
    // violated by 84 px on both large legs.
    for (const [window, keyboard] of [
      [LARGE_WINDOW.height, 260],
      [LARGE_WINDOW.height, 400], // a taller IME than the api-35 leg reported
      [SMALL_WINDOW.height, 150],
      [SMALL_WINDOW.height, 0],
      [LARGE_WINDOW.height, 0],
      [640, 620], // a keyboard taller than the sheet: the clamp is the answer
    ] as const) {
      const layout = importSheetLayoutFor(window, keyboard);
      expect(layout.fieldMaxHeight).toBeLessThanOrEqual(roomFor(window, layout.inset));
      expect(layout.fieldMinHeight).toBeLessThanOrEqual(layout.fieldMaxHeight);
    }
  });

  it('pads by no more keyboard than the sheet can absorb, and all of it otherwise', () => {
    // The measured insets on the large AVDs (217 and 255 dp) are absorbed in
    // full: the actions row rides above the whole keyboard, which is BUG-197's
    // fix preserved.
    expect(importSheetLayoutFor(LARGE_WINDOW.height, 260).inset).toBe(260);
    expect(importSheetLayoutFor(LARGE_WINDOW.height, 255).inset).toBe(255);
    // A keyboard taller than the sheet can absorb pads only to the clamp, so
    // the layout still fits instead of overflowing into the actions row.
    const absurd = importSheetLayoutFor(LARGE_WINDOW.height, 620);
    expect(absurd.inset).toBeLessThan(620);
    expect(absurd.fieldMaxHeight).toBe(absurd.fieldMinHeight);
  });

  it('never collapses the field below two lines, whatever the keyboard does', () => {
    for (const [window, keyboard] of [
      [LARGE_WINDOW.height, 400],
      [LARGE_WINDOW.height, 260],
      [SMALL_WINDOW.height, 150],
      [640, 620],
    ] as const) {
      const { fieldMinHeight } = importSheetLayoutFor(window, keyboard);
      expect(fieldMinHeight).toBeGreaterThanOrEqual(2 * typography.body.lineHeight);
    }
  });

  it('keeps the field tall enough to read a pasted row when the keyboard is down', () => {
    const { fieldMaxHeight } = importSheetLayoutFor(LARGE_WINDOW.height, 0);
    expect(fieldMaxHeight).toBeGreaterThanOrEqual(3 * typography.body.lineHeight);
  });
});

/**
 * A run store that carries the E2E build's own day and no marks: the shape
 * the app's construction site builds, narrowed to what this screen reads
 * (the same store stops.test.tsx builds).
 */
function storeForTest() {
  const theDay = { status: 'ok' as const, source: 'cache' as const, snapshot: e2eDay() };
  return {
    load: () => Promise.resolve(theDay),
    refresh: () => Promise.resolve(theDay),
    deliveredMarks: () => Promise.resolve([]),
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    close: () => Promise.resolve(),
    applyRouteOrder: () => Promise.resolve(false),
  };
}

describe('the import sheet on the tall window with the keyboard up (BUG-305)', () => {
  let windowSpy: jest.SpyInstance;

  beforeEach(() => {
    windowSpy = jest.spyOn(Dimensions, 'get').mockReturnValue(LARGE_WINDOW);
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('closes the sheet with the dismiss control while the paste field is focused', async () => {
    const listeners: Record<string, (e: { endCoordinates: { height: number } }) => void> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((event, cb) => {
      listeners[event] = cb;
      return { remove: jest.fn() };
    });
    try {
      render(
        <RunProvider store={storeForTest()}>
          <RouteTab />
        </RunProvider>,
      );
      await waitFor(() => expect(screen.getByTestId('stops-screen')).toBeTruthy());
      fireEvent.press(screen.getByTestId('stops-import'));
      await waitFor(() => expect(screen.getByTestId('stops-import-sheet')).toBeTruthy());

      // The keyboard opens with the inset the api-34 leg reported (255-260 dp).
      act(() => {
        listeners['keyboardDidShow']({ endCoordinates: { height: 260 } });
      });
      const field = screen.getByTestId('stops-import-text');
      expect(field).toBeTruthy();
      fireEvent.changeText(field, 'address,type,notes\n1 Import Lane, delivery, leave at door');

      // The dismiss is a touch target in its own right: the field's box must
      // not stand where the button does (the 84 px overlap in the CI dumps).
      const dismiss = screen.getByTestId('stops-import-dismiss');
      expect(dismiss).toBeTruthy();
      fireEvent.press(dismiss);

      await waitFor(() => {
        expect(screen.queryByTestId('stops-import-sheet')).toBeNull();
      });
    } finally {
      spy.mockRestore();
    }
  });
});
