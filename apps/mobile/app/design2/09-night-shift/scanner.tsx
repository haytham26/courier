/**
 * The Scanner screen of the 09-night-shift direction.
 *
 * The screen itself is in apps/mobile/src/design2/: every direction of the
 * round shows the same brief in its own grammar, and the four screens of a
 * direction share one implementation so the ten directions can be compared.
 */
import React from 'react';
import { ScannerScreen } from '@/design2/ScannerScreen';

export default function NightShiftscannerRoute() {
  return <ScannerScreen />;
}
