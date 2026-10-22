/**
 * The scope of a direction of the design lab.
 *
 * Every direction of the round is a route of the app, and the route carries
 * the palette of the direction, the light or the night, and the state the
 * screen is showing. The three of them live here, so a screen reads one
 * context and never has to know which direction it is part of.
 *
 * The scope never writes anything to the device: a lab route is a palette,
 * not a choice the courier made (the same rule as `ThemeScope`).
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { themes } from '@courier/design-tokens/themes';
import { directions2, type Direction2, type Direction2Name } from '@courier/design-tokens/directions2';
import { ThemeScope, useTheme } from '@/providers/ThemeProvider';

/** Light or night. The day is the default; the night is the adapted option. */
export type LabMode = 'light' | 'night';

/**
 * The states of a screen.
 *
 * Every screen of the product has all seven (SPEC-5), so every screen of a
 * direction has them too. The lab lets the founder look at each one.
 */
export type LabState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'partial'
  | 'denied'
  | 'long';

export const labStateNames: LabState[] = [
  'ready',
  'loading',
  'empty',
  'error',
  'offline',
  'partial',
  'denied',
  'long',
];

/** The words of the states, so the screen reader reads a sentence. */
export const labStateWords: Record<LabState, string> = {
  ready: 'Ready',
  loading: 'Loading',
  empty: 'Nothing to show',
  error: 'Something went wrong',
  offline: 'Offline',
  partial: 'Partly synced',
  denied: 'Permission needed',
  long: 'Full run, 300 stops',
};

/**
 * Whether a word is one of the states.
 *
 * The state can arrive in the address of the route, so a word that is not a
 * state is ignored rather than trusted.
 */
export function isLabState(value: string | undefined): value is LabState {
  return value !== undefined && labStateNames.includes(value as LabState);
}

interface DirectionScopeValue {
  direction: Direction2;
  mode: LabMode;
  setMode: (mode: LabMode) => void;
  state: LabState;
  setState: (state: LabState) => void;
  /** Whether the next stop of the run has been confirmed. */
  confirmed: boolean;
  /** Confirms the next stop, the way the direction of the round does it. */
  confirm: () => void;
}

const DirectionScopeContext = createContext<DirectionScopeValue | undefined>(undefined);

export function DirectionScope({
  direction,
  initialState = 'ready',
  children,
}: {
  direction: Direction2;
  /** The state the screen opens in. The lab can open any of the seven. */
  initialState?: LabState;
  children: React.ReactNode;
}): React.JSX.Element {
  const params = useLocalSearchParams<{ theme?: string; state?: string }>();
  const [mode, setMode] = useState<LabMode>(params.theme === 'night' ? 'night' : 'light');
  const [state, setState] = useState<LabState>(
    isLabState(params.state) ? params.state : initialState,
  );
  const [confirmed, setConfirmed] = useState(false);

  const confirm = useCallback(() => {
    setConfirmed(true);
  }, []);

  const value = useMemo<DirectionScopeValue>(
    () => ({ direction, mode, setMode, state, setState, confirmed, confirm }),
    [direction, mode, state, confirmed, confirm],
  );

  const theme = mode === 'night' ? themes[direction.nightThemeName] : themes[direction.themeName];

  return (
    <ThemeScope theme={theme}>
      <DirectionScopeContext.Provider value={value}>{children}</DirectionScopeContext.Provider>
    </ThemeScope>
  );
}

/**
 * Reads the direction of the screen.
 *
 * It throws when there is no scope, because a screen of the lab without a
 * direction has no palette and no scale: that is a broken screen, not a
 * screen with defaults.
 */
export function useDirection(): DirectionScopeValue {
  const context = useContext(DirectionScopeContext);
  if (!context) {
    throw new Error('useDirection must be used within a DirectionScope');
  }
  return context;
}

/**
 * The theme of the direction, in the light or in the night.
 *
 * It reads the theme of the scope, so a component never has to know whether
 * the lab is showing the day or the night.
 */
export function useDirectionTheme() {
  const { theme } = useTheme();
  return theme;
}

/**
 * The direction of a name.
 *
 * The routes of the lab are written by hand, so a typo in a route is a
 * screen with no palette; this turns the name into the direction and throws
 * when the name is not one of the four.
 */
export function directionOf(name: Direction2Name): Direction2 {
  const direction = directions2[name];
  if (!direction) {
    throw new Error(`not a direction of the round: ${name}`);
  }
  return direction;
}

/** The screen of a direction that the lab shows, and its route name. */
export type LabScreen = 'today' | 'driving' | 'copilot' | 'scanner';

export const labScreens: LabScreen[] = ['today', 'driving', 'copilot', 'scanner'];

/** The words of the four screens, for the chrome of the lab. */
export const labScreenWords: Record<LabScreen, string> = {
  today: 'Today',
  driving: 'Driving',
  copilot: 'Copilot',
  scanner: 'Scanner',
};

/**
 * The styles of the direction, as a React Native text style.
 *
 * The sizes live in the token package, so a screen never writes a size of
 * its own.
 */
export function useTypeScale() {
  const { direction } = useDirection();
  return direction.type;
}

/** A callback that is stable across renders, for the press handlers. */
export function useLabAction(action: () => void): () => void {
  return useCallback(action, [action]);
}
