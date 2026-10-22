import React from 'react';
import { LabDirection } from '@/design2/lab-04-06/LabDirection';
import { labDirections } from '@courier/design-tokens/lab-directions';

/**
 * Direction 04 - Voice Ribbon. The four screens of the direction, in the
 * order of the spec: Today, Driving, Copilot and Scanner.
 */
export default function VoiceRibbonLayout() {
  return <LabDirection direction={labDirections.voiceRibbon} />;
}
