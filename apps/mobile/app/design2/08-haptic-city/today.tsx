/**
 * The Today screen of the 08-haptic-city direction.
 *
 * The screen itself is in pps/mobile/src/design2/: every direction of the
 * round shows the same brief in its own grammar, and the four screens of a
 * direction share one implementation so the ten directions can be compared.
 */
import React from 'react';
import { TodayScreen } from '@/design2/TodayScreen';

export default function HapticCitytodayRoute() {
  return <TodayScreen />;
}
