/**
 * The drive at night (12-driving-night.html), on the chosen tokens.
 *
 * The reference is the drive in the dark theme: the same turn card, the same
 * stop panel, the same Slide to Deliver, and the map in its night palette. The
 * implementation is the drive itself with the mode pinned to dark, so there is
 * one screen to fix and the design gate compares light against dark side by
 * side (MASTER_EXECUTION §13.3: light is the default, night is the adapted
 * option).
 *
 * A root-stack route, not a tab: like the day drive, it owns the whole screen.
 * The way in is the Go on Today when the device is in its dark theme, and the
 * map-style button turns the theme by hand.
 */
import React from 'react';

import { ChosenProvider } from '@/components/chosen';
import { DrivingScreen } from './driving';

export default function DrivingNightRoute() {
  return (
    <ChosenProvider mode="dark">
      <DrivingScreen />
    </ChosenProvider>
  );
}
