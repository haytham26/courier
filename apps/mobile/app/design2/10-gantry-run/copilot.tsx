/**
 * The Copilot screen of the 10-gantry-run direction.
 *
 * The screen itself is in pps/mobile/src/design2/: every direction of the
 * round shows the same brief in its own grammar, and the four screens of a
 * direction share one implementation so the ten directions can be compared.
 */
import React from 'react';
import { CopilotScreen } from '@/design2/CopilotScreen';

export default function GantryRuncopilotRoute() {
  return <CopilotScreen />;
}
