/**
 * The floating tab bar (D34): five slots, the raised centre is a sphere, the
 * caption of the last thing heard under the bar, and the active slot takes
 * the quiet pill token with the accentText label.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ChosenProvider, TabBar } from '../index';
import { styleOf } from '../test-support';
import { tokens } from '@courier/design-tokens/chosen';

const slots = (activeKey: string, onPress: () => void = () => {}) => [
  { key: 'today', label: 'Today', name: 'calendar' as const, active: activeKey === 'today', onPress },
  { key: 'route', label: 'Route', name: 'list' as const, active: activeKey === 'route', onPress },
  { key: 'copilot', label: 'Copilot', name: 'mic' as const, active: activeKey === 'copilot', onPress },
  { key: 'map', label: 'Map', name: 'map' as const, active: activeKey === 'map', onPress },
  { key: 'account', label: 'Account', name: 'person' as const, active: activeKey === 'account', onPress },
] as const;

const renderBar = (mode: 'light' | 'dark', activeKey = 'today', caption?: string) => {
  const [today, route, copilot, map, account] = slots(activeKey);
  return render(
    <ChosenProvider mode={mode}>
      <TabBar
        left={[today, route]}
        right={[map, account]}
        copilot={{ state: 'idle', onPress: copilot.onPress, onLongPress: copilot.onPress }}
        caption={caption}
      />
    </ChosenProvider>,
  );
};

describe('the tab bar', () => {
  it.each(['light', 'dark'] as const)('%s: the active item takes the pill token and the accentText label (D33)', (mode) => {
    const t = tokens(mode);
    renderBar(mode, 'today');
    expect(styleOf(screen.getByTestId('tab-today'))['backgroundColor']).toBe(t.colors.tabActiveFill);
    const label = styleOf(screen.getByText('Today'));
    expect(label['color']).toBe(t.colors.accentText);
    expect(label['fontSize']).toBe(t.typography.label.size);
  });

  it('the centre is the raised Copilot sphere (D34), not a flat item', () => {
    renderBar('light');
    expect(screen.getByTestId('copilot-sphere')).toBeTruthy();
  });

  it.each(['light', 'dark'] as const)('%s: the caption of the last thing heard is under the bar', (mode) => {
    const t = tokens(mode);
    renderBar(mode, 'route', 'Where is the next stop');
    expect(styleOf(screen.getByTestId('tab-caption'))['color']).toBe(t.colors.secondaryLabel);
  });

  it('the inactive label is the secondary label', () => {
    const t = tokens('dark');
    renderBar('dark', 'map');
    expect(styleOf(screen.getByText('Today'))['color']).toBe(t.colors.secondaryLabel);
  });
});
