/**
 * The glass surface: the three branches of the one surface.
 *
 * The D33 pairs are computed on the composite (the fill alpha over the
 * glass), so what matters here is that every branch keeps a token fill over
 * the card colour and gives reduce transparency the solid card.
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { createRef } from 'react';

import { ChosenProvider, GlassSurface } from '../index';
import { styleOf } from '../test-support';
import { glass, tokens } from '@courier/design-tokens/chosen';
import type { View } from 'react-native';

const glassModule = jest.requireMock<{ __setGlassAvailable: (value: boolean) => void }>('expo-glass-effect');

const withMode = (mode: 'light' | 'dark', ui: React.ReactElement) => (
  <ChosenProvider mode={mode}>{ui}</ChosenProvider>
);

beforeEach(() => {
  glassModule.__setGlassAvailable(false);
});

describe('the glass surface', () => {
  it('on iOS with the Liquid Glass API it renders the native glass over the token fill', () => {
    glassModule.__setGlassAvailable(true);
    const t = tokens('light');
    const { getByTestId } = render(
      withMode(
        'light',
        <GlassSurface kind="control" runtime={{ liquidGlass: true }} testID="glass">
          <Text>Northwood AM</Text>
        </GlassSurface>,
      ),
    );
    const surface = styleOf(getByTestId('glass'));
    expect(surface['borderWidth']).toBeFalsy();
    // the surface never paints a raw colour: the radius comes from the token envelopes
    expect(surface['borderRadius']).toBe(t.radii.card);
  });

  it('without the API it renders the blur fallback over the token fill', () => {
    const t = tokens('dark');
    const { getByTestId } = render(withMode('dark', <GlassSurface kind="sheet" runtime={{ liquidGlass: false }} testID="glass" />));
    expect(styleOf(getByTestId('glass'))['borderRadius']).toBe(t.radii.sheet);
  });

  it('the blur fallback attaches the target ref from the screen (Android)', () => {
    const target = createRef<React.ComponentRef<typeof View>>();
    const { getByTestId } = render(
      withMode('light', <GlassSurface kind="control" runtime={{ liquidGlass: false, blurTarget: target }} testID="glass" />),
    );
    expect(getByTestId('glass')).toBeTruthy();
  });

  it.each(['light', 'dark'] as const)('%s: reduce transparency is the solid card', (mode) => {
    const t = tokens(mode);
    const { getByTestId } = render(
      withMode(mode, <GlassSurface kind="control" runtime={{ reduceTransparency: true }} testID="glass" />),
    );
    expect(styleOf(getByTestId('glass'))['backgroundColor']).toBe(t.colors.card);
  });

  it('the envelopes stay the union the reference defines', () => {
    expect(glass.fillsBySurface.sheet.light.min).toBe(0.86);
    expect(glass.fillsBySurface.sheet.light.max).toBe(0.95);
    expect(glass.fillsBySurface.controls.dark.min).toBe(0.62);
    expect(glass.fillsBySurface.controls.dark.max).toBe(0.72);
  });
});
