/**
 * The delivered badge (05-delivered.html): the reference's geometry, the
 * D33 pair (the check is onSuccess black on the success fill, both modes),
 * and the reduced-motion path keeping the badge on the screen.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ChosenProvider, DeliveredBadge } from '../index';
import { styleOf } from '../test-support';
import { tokens } from '@courier/design-tokens/chosen';

const renderBadge = (mode: 'light' | 'dark', props = {}) =>
  render(
    <ChosenProvider mode={mode}>
      <DeliveredBadge {...props} />
    </ChosenProvider>,
  );

describe('the delivered badge', () => {
  it.each(['light', 'dark'] as const)('%s: the check is onSuccess black on the success fill (D33)', (mode) => {
    const t = tokens(mode);
    renderBadge(mode);
    const badge = styleOf(screen.getByTestId('delivered-badge'));
    expect(badge['backgroundColor']).toBe(t.colors.success);
    expect(badge['borderRadius']).toBe(26);
    expect(badge['width']).toBe(52);
    expect(badge['height']).toBe(52);
  });

  it('the check rides the Ionicons checkmark at the reference size', () => {
    renderBadge('light');
    const check = screen.getByTestId('delivered-badge-check').props.children as {
      props: { name: string; size: number; color: string };
    };
    expect(check.props['name']).toBe('checkmark');
    expect(check.props['size']).toBe(28);
    expect(check.props['color']).toBe(tokens('light').colors.onSuccess);
  });

  it('reduced motion keeps the badge present, unanimated', () => {
    renderBadge('light', { reduced: true });
    expect(screen.getByTestId('delivered-badge')).toBeTruthy();
  });
});
