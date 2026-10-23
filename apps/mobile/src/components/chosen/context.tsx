/**
 * The context of the chosen components.
 *
 * Every component below reads the ONE token file (`@courier/design-tokens/chosen`)
 * and nothing else: the legacy theme modules are not reachable from here, so
 * the boundary between the old design and the D27 choice is an import edge,
 * not a rule. The mode comes from the OS colour scheme, and a screen (or a
 * test) can pin it. The light and the dark set are asserted per component.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { tokens, type Tokens } from '@courier/design-tokens/chosen';

import type { MapsFirstColorMode } from './types';

interface ChosenContextValue {
  t: Tokens;
  mode: MapsFirstColorMode;
}

const ChosenContext = createContext<ChosenContextValue | undefined>(undefined);

export interface ChosenProviderProps {
  children: React.ReactNode;
  /** Pin the mode (tests and the dark screens use this). */
  mode?: MapsFirstColorMode;
}

export const ChosenProvider = ({ children, mode: forced }: ChosenProviderProps) => {
  const system = useColorScheme();
  const mode: MapsFirstColorMode = forced ?? (system === 'dark' ? 'dark' : 'light');
  const value = useMemo(() => ({ t: tokens(mode), mode }), [mode]);
  return <ChosenContext.Provider value={value}>{children}</ChosenContext.Provider>;
};

export const useChosen = (): ChosenContextValue => {
  const ctx = useContext(ChosenContext);
  if (!ctx) {
    throw new Error('useChosen needs a ChosenProvider above it');
  }
  return ctx;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const body = hex.replace('#', '');
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ];
};

const toHex = (rgb: [number, number, number]) =>
  `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;

/**
 * A rgba palette value composited over the card colour, as a hex string:
 * what a drawing layer (the Skia sphere) needs when the token is a recipe.
 */
export const resolveOverCard = (t: Tokens, name: keyof Tokens['colors']): string => {
  const value = t.colors[name];
  if (!value.startsWith('rgba')) {
    return value;
  }
  const parts = value.slice(5, -1).split(',');
  const alpha = Number(parts[3]);
  const card = hexToRgb(t.colors.card);
  const rgb: [number, number, number] = [0, 1, 2].map(
    (i) => Math.round(Number(parts[i]) * alpha + card[i] * (1 - alpha)),
  ) as [number, number, number];
  return toHex(rgb);
};
