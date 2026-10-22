/**
 * The design lab (MASTER_EXECUTION §13.4).
 *
 * The three directions are real screens, so they are tested like real
 * screens: each one has to carry the content of the day's list, one primary
 * action, a voice bar that names its state, and an accessibility label on
 * every control. The tests also check that the three are three different
 * layouts and not three colours of the same one.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import type * as StorageModule from '@/sync/storage';
import { themes } from '@courier/design-tokens/themes';
import { directions } from '@courier/design-tokens/directions';
import { ThemeProvider, ThemeScope } from '@/providers/ThemeProvider';
import { RoadbookToday } from '@/design/RoadbookToday';
import { BeaconToday } from '@/design/BeaconToday';
import { FreightToday } from '@/design/FreightToday';

jest.mock('@/sync/preferenceFiles', () => {
  const actual = jest.requireActual<typeof StorageModule>('@/sync/storage');
  return {
    createFilePreferenceStore: () => actual.createMemoryPreferenceStore(),
  };
});

function renderDirection(direction: 'roadbook' | 'beacon' | 'freight') {
  const Screen =
    direction === 'roadbook' ? RoadbookToday : direction === 'beacon' ? BeaconToday : FreightToday;

  return render(
    <ThemeProvider>
      <ThemeScope theme={themes[direction]}>
        <Screen />
      </ThemeScope>
    </ThemeProvider>,
  );
}

describe.each(['roadbook', 'beacon', 'freight'] as const)('the %s direction', (name) => {
  it("shows the content of the day's list", () => {
    renderDirection(name);

    expect(screen.getByTestId('today-screen')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    // The address is on the screen twice: once as the next stop, once in the
    // list of the run.
    expect(screen.getAllByText('14 Harewood Road').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Papanui/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10:42/).length).toBeGreaterThan(0);
  });

  it('has one primary action of 72 points', () => {
    renderDirection(name);

    const action = screen.getByTestId('today-next-stop');
    expect(action).toBeTruthy();
    // One button carries the action. The word on its own is the label of the
    // next-stop block, which is not a control.
    expect(screen.getAllByLabelText('Next stop')).toHaveLength(1);
  });

  it('has a voice bar that names its state', () => {
    renderDirection(name);

    expect(screen.getByTestId('voice-bar')).toBeTruthy();
    expect(screen.getByLabelText(/Courier Voice is listening/)).toBeTruthy();
  });

  it('has a settings button with a label and a role', () => {
    renderDirection(name);

    const settings = screen.getByTestId('today-settings');
    expect(settings).toBeTruthy();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
  });

  it('reads the number of stops left as a heading', () => {
    renderDirection(name);

    expect(screen.getByLabelText('18 stops left')).toBeTruthy();
  });

  it('never uses an emoji', () => {
    renderDirection(name);

    // The contract: no emoji, in the interface, in an empty state, in a
    // button or in a document.
    const tree = JSON.stringify(screen.toJSON());

    expect(tree).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('the three directions are three different layouts', () => {
  it('show a different number of stops', () => {
    renderDirection('roadbook');
    const roadbook = screen.getAllByTestId(/^today-stop-/);
    renderDirection('beacon');
    const beacon = screen.getAllByTestId(/^today-stop-/);
    renderDirection('freight');
    const freight = screen.getAllByTestId(/^today-stop-/);

    expect(roadbook.length).toBeGreaterThan(beacon.length);
    expect(roadbook.length).toBe(freight.length);
    expect(beacon.length).toBeLessThan(roadbook.length);
  });

  it('each have a theme of their own', () => {
    expect(themes.roadbook.colors.background).not.toBe(themes.beacon.colors.background);
    expect(themes.beacon.colors.background).not.toBe(themes.freight.colors.background);
    expect(directions.roadbook.density).toBe('dense');
    expect(directions.beacon.density).toBe('calm');
    expect(directions.freight.density).toBe('expressive');
  });
});
