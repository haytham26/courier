import React from 'react';
import { useLabScope } from '@/design2/lab-04-06/labTheme';
import { VoiceRibbonDriving } from '@/design2/lab-04-06/voice-ribbon/Driving';

/** Direction 04 - Voice Ribbon. Driving. */
export default function Driving() {
  const { state } = useLabScope();
  return <VoiceRibbonDriving state={state} />;
}
