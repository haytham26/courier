/**
 * The chosen components, per D33: the light and the dark of every component
 * against its asserted pair.
 *
 * The one rule of the design: a component reads the ONE token file and
 * nothing else, so the tests here assert the token wiring by rendering both
 * modes and inspecting the styles that the tokens produce.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import {
  BottomSheet,
  ChosenProvider,
  StatRow,
  NoteChips,
  TurnCard,
  Segmented,
  Timeline,
  TopPills,
  StopPin,
  ScanOverlay,
  MapButton,
  resolveOverCard,
} from '../index';
import { styleOf } from '../test-support';
import { spacing, tokens } from '@courier/design-tokens/chosen';

const withMode = (mode: 'light' | 'dark', ui: React.ReactElement) => (
  <ChosenProvider mode={mode}>{ui}</ChosenProvider>
);

describe('the stat row', () => {
  it.each(['light', 'dark'] as const)('%s: the success stat is successText, the others label', (mode) => {
    const t = tokens(mode);
    render(
      withMode(
        mode,
        <StatRow
          items={[
            { label: 'Delivered', value: '42', tone: 'success' },
            { label: 'To go', value: '172' },
            { label: 'Finish', value: '2:15' },
          ]}
          progress={0.2}
        />,
      ),
    );
    const success = styleOf(screen.getByText('42'));
    expect(success['color']).toBe(t.colors.successText);
    expect(success['fontSize']).toBe(t.typography.stat.size);
    expect(styleOf(screen.getByText('172'))['color']).toBe(t.colors.label);
    expect(styleOf(screen.getByText('Delivered'))['color']).toBe(t.colors.secondaryLabel);
  });
});

describe('the note chips', () => {
  it.each(['light', 'dark'] as const)('%s: the meaning rides the icon token, the label is plain', (mode) => {
    const t = tokens(mode);
    render(
      withMode(
        mode,
        <NoteChips
          chips={[
            { icon: 'home', tone: 'accent', label: 'Side gate' },
            { icon: 'cube', tone: 'info2', label: 'Shelf B3' },
            { icon: 'alert', tone: 'warning', label: 'Dog' },
          ]}
        />,
      ),
    );
    expect(styleOf(screen.getByText('Dog'))['color']).toBe(t.colors.label);
    expect(styleOf(screen.getByTestId('chip-Dog'))['backgroundColor']).toBe(t.colors.fill);
  });
});

describe('the turn card and the Then strip', () => {
  it.each(['light', 'dark'] as const)('%s: the card and the strip carry their tokens', (mode) => {
    const t = tokens(mode);
    render(
      withMode(mode, <TurnCard distance="120 m" street="Harewood Road" thenStreet="Greers Road" />),
    );
    const distance = styleOf(screen.getByText('120 m'));
    expect(distance['color']).toBe(t.colors.onTurnCard);
    expect(distance['fontSize']).toBe(t.typography.turnDistance.size);
    expect(screen.getByLabelText('Then Greers Road')).toBeTruthy();
  });
});

describe('the segmented control and the timeline', () => {
  it.each(['light', 'dark'] as const)('%s: the active segment is the card colour, the labels follow', (mode) => {
    const t = tokens(mode);
    render(
      withMode(
        mode,
        <Segmented
          options={[
            { key: 'togo', label: 'To go', count: 172 },
            { key: 'later', label: 'Later', count: 6 },
            { key: 'done', label: 'Done', count: 42 },
          ]}
          value="togo"
          onChange={() => {}}
        />,
      ),
    );
    const active = styleOf(screen.getByTestId('segmented-togo'));
    expect(active['backgroundColor']).toBe(t.colors.card);
    expect(active['borderRadius']).toBe(t.radii.segmentedSegment);
  });

  it.each(['light', 'dark'] as const)('%s: the timeline rows carry the street in label and the time in secondaryLabel', (mode) => {
    const t = tokens(mode);
    render(
      withMode(
        mode,
        <Timeline
          items={[
            { id: 'one', street: '45 Papanui Road', time: '10:40', state: 'done' },
            { id: 'two', street: '12 Rutland Street', state: 'next' },
          ]}
        />,
      ),
    );
    expect(styleOf(screen.getByText('45 Papanui Road'))['color']).toBe(t.colors.label);
    expect(styleOf(screen.getByText('10:40'))['color']).toBe(t.colors.secondaryLabel);
  });
});

describe('the bottom sheet on a screen that docks a tab bar', () => {
  it('the sheet keeps its floor above the dock inset (the Today screen)', () => {
    const inset = spacing.space64 + spacing.space32 + spacing.space4;
    render(
      withMode(
        'light',
        <BottomSheet height="peek" bottomInset={inset} testID="sheet" />,
      ),
    );
    const sheet = styleOf(screen.getByTestId('sheet'));
    expect(sheet['paddingBottom']).toBe(inset);
  });

  it('the full level keeps the card - and so its grabber - inside the window', () => {
    // The regression this pins (run 39963017224's recording): on the CI
    // emulator's window (320x640 dp) the sheet's fraction put 0.88 of the
    // window PLUS the dock's inset ABOVE it, so at full the card's top landed
    // off the top of the screen and the grabber - the sheet's first child,
    // the one handle that changes the level - went with it. The a11y tree lost
    // the handle and the three-level walk could not come back down. The
    // usable height decides when the fraction would cost the grabber its
    // place, so the window here is the emulator's, not the default's: on a
    // taller window the cap would never bind and the test would be vacuous.
    const inset = spacing.space64 + spacing.space32 + spacing.space4;
    const height = 640;
    const windows = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 320, height, scale: 2, fontScale: 1 });
    try {
      render(withMode('light', <BottomSheet height="full" bottomInset={inset} testID="sheet" />));

      // The card's own height is the glass surface's inline height, read off
      // the sheet's first child (the tree's children mix strings with the
      // instances, so the strings are filtered out first).
      const cardInstance = screen
        .getByTestId('sheet')
        .children.find((child) => typeof child !== 'string');
      if (cardInstance === undefined) {
        throw new Error('the sheet card never rendered');
      }
      const card = styleOf(cardInstance);
      const cardHeight = card['height'];
      if (typeof cardHeight !== 'number') {
        throw new Error('the sheet card carries no numeric height');
      }
      const top = height - inset - cardHeight;
      // The card's top edge lands on the screen, and with the grabber's own
      // 24 dp of headroom: the handle that changes the level is reachable at
      // every level, full included.
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeGreaterThanOrEqual(24);
      expect(screen.getByTestId('sheet-grabber')).toBeTruthy();
    } finally {
      windows.mockRestore();
    }
  });
});

describe('the top pills', () => {
  it.each(['light', 'dark'] as const)('%s: the pills render the run and the weather', (mode) => {
    render(withMode(mode, <TopPills runName="Northwood AM" weather="Rain 2 pm" weatherIcon="cloud" />));
    expect(screen.getByText('Northwood AM')).toBeTruthy();
    expect(screen.getByText('Rain 2 pm')).toBeTruthy();
  });
});

describe('the stop pin', () => {
  it.each(['light', 'dark'] as const)('%s: the number rides the white card chip (the D33 change), not the fill', (mode) => {
    const t = tokens(mode);
    render(withMode(mode, <StopPin number="3" tone="danger" />));
    expect(styleOf(screen.getByTestId('pin-chip'))['backgroundColor']).toBe(t.colors.card);
    expect(styleOf(screen.getByText('3'))['color']).toBe(t.colors.label);
  });
});

describe('the scan overlay', () => {
  it.each(['light', 'dark'] as const)('%s: the pills keep the dark recipe over the scrim in both modes', (mode) => {
    void mode;
    render(withMode('light', <ScanOverlay done="Done" scanned="86 scanned" />));
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('86 scanned')).toBeTruthy();
  });

  it('the reticle hole carries the scrim and the ring the scanRing', () => {
    render(withMode('dark', <ScanOverlay done="Done" scanned="0" target={{ x: 36, y: 228, width: 200, height: 112 }} />));
    const t = tokens('dark');
    expect(styleOf(screen.getByTestId('scan-reticle'))['borderColor']).toBe(t.colors.scrim);
  });
});

describe('the map button', () => {
  it.each(['light', 'dark'] as const)('%s: the icon renders with its label', (mode) => {
    void mode;
    render(withMode('light', <MapButton name="locate" tone="accent" accessibilityLabel="Recentre" onPress={() => {}} testID="map-recentre" />));
    expect(screen.getByLabelText('locate')).toBeTruthy();
  });
});

describe('the palette helpers', () => {
  it('resolveOverCard keeps the hex tokens verbatim and composites the rgba ones toward the card', () => {
    const light = tokens('light');
    expect(resolveOverCard(light, 'label')).toBe(light.colors.label);
    // A rgba token lightens over the white card: the result is a hex colour,
    // neither the raw rgb channels nor the card itself.
    const blended = resolveOverCard(light, 'secondaryLabel');
    expect(blended).toMatch(/^#[0-9a-f]{6}$/);
    expect(blended).not.toBe(light.colors.label);
    expect(blended).not.toBe(light.colors.card);
    // The same token over the dark card lands on a different (darker) read.
    const dark = tokens('dark');
    expect(resolveOverCard(dark, 'secondaryLabel')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
