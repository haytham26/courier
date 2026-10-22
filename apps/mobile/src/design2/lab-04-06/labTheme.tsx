/**
 * The shared ground of the design lab's second round (MASTER_EXECUTION §13.6).
 *
 * The three directions of this team - **04 Voice Ribbon**, **05 X-ray Parcel**
 * and **06 Scanline** - are real screens in the app, in light and in night.
 * This module holds the parts they share: the type step, the entering
 * animation, the day/night switch and the state the screens read.
 *
 * The rules come from `docs/design/SYSTEM.md` and from the spec of the round
 * (`docs/design/SPEC.md`): the tokens only, one primary action per screen,
 * 150-250 ms on the UI thread, and "reduce motion" respected - the movement
 * still happens, it simply has no travel.
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { themes, type Theme } from '@courier/design-tokens/themes';
import type { LabDirection, LabTypeStep } from '@courier/design-tokens/lab-directions';

/** The two palettes of a direction: the day and its adapted night. */
export type LabVariant = 'day' | 'night';

/** The theme of a direction in one of its two variants. */
export function themeFor(direction: LabDirection, variant: LabVariant): Theme {
  return variant === 'night' ? themes[direction.nightThemeName] : themes[direction.themeName];
}

/** The type step of a direction, as a React Native text style. */
export function typeStyle(step: LabTypeStep): TextStyle {
  return {
    fontSize: step.fontSize,
    lineHeight: step.lineHeight,
    letterSpacing: step.letterSpacing,
    fontWeight: step.fontWeight,
  };
}

/**
 * The entering animation of a direction.
 *
 * - Voice Ribbon: the block is drawn up out of the ribbon at the bottom.
 * - X-ray Parcel: the parcel opens out of its flat state.
 * - Scanline: the band wipes across, the way the scanner reads a label.
 *
 * With "reduce motion" on, the movement becomes instant - it is never
 * removed, because a screen that appears with nothing happening reads as a
 * broken screen.
 */
export function enteringFor(direction: LabDirection, reducedMotion: boolean) {
  const duration = reducedMotion ? 0 : direction.motion.durationMs;

  switch (direction.motion.enter) {
    case 'ribbon':
      return FadeInDown.duration(duration);
    case 'unfold':
      return SlideInRight.duration(duration);
    case 'scan':
    default:
      return FadeIn.duration(duration);
  }
}

/**
 * The day/night switch of the lab.
 *
 * The lab is a candidate, not a product: the founder flips between the two
 * palettes of a direction and between the states of a screen without leaving
 * the direction. Both are props of the route (`?theme=night` and
 * `?state=offline`), so a screenshot is reproducible from its URL.
 */
interface LabScopeValue {
  variant: LabVariant;
  state: LabScreenState;
  setVariant: (variant: LabVariant) => void;
  setState: (state: LabScreenState) => void;
}

const LabScopeContext = createContext<LabScopeValue>({
  variant: 'day',
  state: 'ready',
  setVariant: () => undefined,
  setState: () => undefined,
});

export function LabScope({
  variant,
  state,
  setVariant,
  setState,
  children,
}: {
  variant: LabVariant;
  state: LabScreenState;
  setVariant: (variant: LabVariant) => void;
  setState: (state: LabScreenState) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useMemo(
    () => ({ variant, state, setVariant, setState }),
    [variant, state, setVariant, setState],
  );
  return <LabScopeContext.Provider value={value}>{children}</LabScopeContext.Provider>;
}

/** The palette and the state the founder is looking at. */
export function useLabScope(): LabScopeValue {
  return useContext(LabScopeContext);
}

/**
 * The states a screen of the lab can be in.
 *
 * The seven states of `docs/design/SYSTEM.md` §4 are real screens here: the
 * route carries the state (`?state=offline`), so the founder can look at
 * each of them and a Maestro flow can reach them by URL.
 */
export type LabScreenState =
  | 'ready'
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'partialSync'
  | 'permissionDenied'
  | 'longList';

/** Whether a string is one of the states of the lab. */
export function isLabScreenState(value: unknown): value is LabScreenState {
  return (
    value === 'ready' ||
    value === 'loading' ||
    value === 'empty' ||
    value === 'error' ||
    value === 'offline' ||
    value === 'partialSync' ||
    value === 'permissionDenied' ||
    value === 'longList'
  );
}

/** The state the route asked for, or the ready state. */
export function labStateFrom(value: unknown): LabScreenState {
  return isLabScreenState(value) ? value : 'ready';
}
