/**
 * The match sheet: what the scanner shows when it read a label.
 *
 * The sheet is the reference's (06-scan.html): the check and the matched
 * address, the place it was found, where the parcel sits in the van, and the
 * one action. The pairs are the D33 rows: the address on the sheet, the
 * supporting line and the section label on the secondary label, the action's
 * label on the accent, and the check's black on the green.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChosenProvider } from '../context';
import { ScanMatchSheet } from '../ScanMatchSheet';
import { styleOf } from '../test-support';
import { tokens } from '@courier/design-tokens/chosen';

const MATCH = { address: '45 Papanui Road', suburb: 'Merivale' };

const renderSheet = (overrides: Partial<React.ComponentProps<typeof ScanMatchSheet>> = {}) => {
  const onVanPositionChange = jest.fn();
  const onAdd = jest.fn();
  render(
    <ChosenProvider mode="light">
      <ScanMatchSheet
        match={MATCH}
        vanPosition="middle"
        onVanPositionChange={onVanPositionChange}
        onAdd={onAdd}
        {...overrides}
      />
    </ChosenProvider>,
  );
  return { onVanPositionChange, onAdd };
};

describe('the match sheet', () => {
  it('reads the address the scanner matched', () => {
    renderSheet();

    expect(screen.getByTestId('scan-match-address')).toHaveTextContent('45 Papanui Road');
    expect(screen.getByTestId('scan-match-subtitle')).toHaveTextContent('Merivale. Matched to the map.');
    expect(screen.getByTestId('scan-van-label')).toHaveTextContent('WHERE IN THE VAN');
    expect(screen.getByTestId('scan-add')).toHaveTextContent('Add and Scan Next');
  });

  it('the D33 pairs: the address on the sheet, the action on the accent, the check on the green', () => {
    renderSheet();
    const t = tokens('light');

    expect(styleOf(screen.getByTestId('scan-match-address')).color).toBe(t.colors.label);
    expect(styleOf(screen.getByTestId('scan-match-subtitle')).color).toBe(t.colors.secondaryLabel);
    expect(styleOf(screen.getByTestId('scan-van-label')).color).toBe(t.colors.secondaryLabel);
    expect(styleOf(screen.getByTestId('scan-add')).backgroundColor).toBe(t.colors.accent);
    expect(styleOf(screen.getByText('Add and Scan Next')).color).toBe(t.colors.onAccent);

    // The badge: the reference's 44 circle on the success fill, with the
    // check (the D33 record: black on the green, the reference's white is
    // 2.2:1).
    const badge = styleOf(screen.getByTestId('scan-match-badge'));
    expect(badge.backgroundColor).toBe(t.colors.success);
    expect(badge.width).toBe(44);
    const check = screen.getByTestId('scan-match-badge-check').props.children as {
      props: { name: string; size: number; color: string };
    };
    expect(check.props.name).toBe('checkmark');
    expect(check.props.color).toBe(t.colors.onSuccess);
  });

  it('starts with the middle of the van and says where the courier moves it', () => {
    const { onVanPositionChange } = renderSheet();

    // The control's contract (Segmented): the active segment carries
    // accessibilityState.selected, the others do not.
    const selectedState = (testID: string): boolean => {
      const props = screen.getByTestId(testID).props as {
        accessibilityState?: { selected?: boolean };
      };
      return props.accessibilityState?.selected === true;
    };

    expect(selectedState('scan-van-middle')).toBe(true);
    expect(selectedState('scan-van-front')).toBe(false);

    fireEvent.press(screen.getByTestId('scan-van-front'));

    expect(onVanPositionChange).toHaveBeenCalledWith('front');
  });

  it('adds the parcel when the courier says so', () => {
    const { onAdd } = renderSheet();

    fireEvent.press(screen.getByTestId('scan-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
